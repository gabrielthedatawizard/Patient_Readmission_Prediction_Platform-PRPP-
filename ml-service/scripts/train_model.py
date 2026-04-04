#!/usr/bin/env python3
"""
Train a readmission prediction model using a normalized clinical dataset.

Pipeline:
1. Load CSV dataset
2. Normalize required feature columns and event dates
3. Split into time-ordered train / validation / test windows
4. Train Logistic Regression baseline + optional XGBoost
5. Select the best candidate on temporal validation performance
6. Calibrate probabilities
7. Save model artifacts (joblib) + metadata (JSON)
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

try:
    import xgboost as xgb

    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

try:
    import shap

    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False


NUMERIC_FEATURES = [
    "age",
    "prior_admissions_12m",
    "length_of_stay_days",
    "charlson_index",
    "egfr",
    "hemoglobin",
    "hba1c",
    "bp_systolic",
    "bp_diastolic",
    "high_risk_medication_count",
    "icu_stay_days",
]

BINARY_FEATURES = [
    "phone_access",
    "transportation_difficulty",
    "lives_alone",
    "has_heart_failure",
    "has_diabetes",
    "has_ckd",
    "has_malaria",
    "has_hiv",
    "on_art",
    "has_tuberculosis",
    "has_severe_acute_malnutrition",
    "has_sickle_cell_disease",
    "neonatal_risk",
]

CATEGORICAL_FEATURES = ["gender"]
ALL_FEATURES = NUMERIC_FEATURES + BINARY_FEATURES + CATEGORICAL_FEATURES
TARGET = "readmitted_30d"
TEMPORAL_DATE_COLUMNS = [
    "discharge_date",
    "dischargeDate",
    "admission_date",
    "admissionDate",
    "event_date",
    "eventDate",
]

FEATURE_NAME_MAP = {
    "age": "age",
    "prior_admissions_12m": "priorAdmissions12m",
    "length_of_stay_days": "lengthOfStayDays",
    "charlson_index": "charlsonIndex",
    "egfr": "egfr",
    "hemoglobin": "hemoglobin",
    "hba1c": "hba1c",
    "bp_systolic": "bpSystolic",
    "bp_diastolic": "bpDiastolic",
    "high_risk_medication_count": "highRiskMedicationCount",
    "icu_stay_days": "icuStayDays",
    "phone_access": "phoneAccess",
    "transportation_difficulty": "transportationDifficulty",
    "lives_alone": "livesAlone",
    "has_heart_failure": "hasHeartFailure",
    "has_diabetes": "hasDiabetes",
    "has_ckd": "hasCkd",
    "has_malaria": "hasMalaria",
    "has_hiv": "hasHiv",
    "on_art": "onArt",
    "has_tuberculosis": "hasTuberculosis",
    "has_severe_acute_malnutrition": "hasSevereAcuteMalnutrition",
    "has_sickle_cell_disease": "hasSickleCellDisease",
    "neonatal_risk": "neonatalRisk",
    "gender": "gender",
}

DEFAULT_FEATURE_VALUES = {
    "has_malaria": 0,
    "has_hiv": 0,
    "on_art": 0,
    "has_tuberculosis": 0,
    "has_severe_acute_malnutrition": 0,
    "has_sickle_cell_disease": 0,
    "neonatal_risk": 0,
}


def ensure_feature_columns(df: pd.DataFrame) -> pd.DataFrame:
    normalized = df.copy()

    if TARGET not in normalized.columns and "readmitted30d" in normalized.columns:
        normalized[TARGET] = normalized["readmitted30d"]

    for feature_name, default_value in DEFAULT_FEATURE_VALUES.items():
        if feature_name not in normalized.columns:
            normalized[feature_name] = default_value

    missing_features = [feature for feature in ALL_FEATURES if feature not in normalized.columns]
    if missing_features:
        raise ValueError(f"Dataset is missing required feature columns: {', '.join(missing_features)}")

    return normalized


def ensure_temporal_column(df: pd.DataFrame) -> pd.DataFrame:
    normalized = df.copy()
    event_dates = None
    source_column = None

    for column in TEMPORAL_DATE_COLUMNS:
        if column not in normalized.columns:
            continue
        parsed = pd.to_datetime(normalized[column], errors="coerce", utc=True)
        if parsed.notna().any():
            event_dates = parsed if event_dates is None else event_dates.fillna(parsed)
            source_column = source_column or column

    if event_dates is None or event_dates.isna().all():
        event_dates = pd.date_range(
            end=datetime.now(timezone.utc),
            periods=len(normalized),
            freq="D",
        )
        source_column = "synthetic_row_order"
    elif event_dates.isna().any():
        fallback_dates = pd.Series(
            pd.date_range(
                end=event_dates.dropna().max(),
                periods=len(normalized),
                freq="D",
            ),
            index=normalized.index,
        )
        event_dates = event_dates.fillna(fallback_dates)

    normalized["_event_date"] = pd.to_datetime(event_dates, utc=True)
    normalized = normalized.sort_values("_event_date").reset_index(drop=True)
    normalized.attrs["event_date_source"] = source_column or "synthetic_row_order"
    return normalized


def compute_split_sizes(row_count: int) -> tuple[int, int, int]:
    if row_count < 3:
        raise ValueError("Temporal training requires at least 3 rows.")

    test_size = max(1, int(round(row_count * 0.15)))
    validation_size = max(1, int(round(row_count * 0.15)))
    train_size = row_count - validation_size - test_size

    if train_size < 1:
        deficit = 1 - train_size
        if validation_size > test_size:
            validation_size = max(1, validation_size - deficit)
        else:
            test_size = max(1, test_size - deficit)
        train_size = row_count - validation_size - test_size

    return train_size, validation_size, test_size


def next_distinct_boundary(df: pd.DataFrame, start_index: int) -> int:
    boundary = start_index
    while (
        boundary < len(df)
        and boundary > 0
        and df.iloc[boundary]["_event_date"] == df.iloc[boundary - 1]["_event_date"]
    ):
        boundary += 1
    return boundary


def temporal_train_validation_test_split(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    if df["_event_date"].nunique() < 3:
        raise ValueError("Temporal training requires at least 3 distinct event dates.")

    train_size, validation_size, _ = compute_split_sizes(len(df))
    validation_start = next_distinct_boundary(df, train_size)
    validation_end = next_distinct_boundary(df, validation_start + validation_size)

    train_df = df.iloc[:validation_start].copy()
    validation_df = df.iloc[validation_start:validation_end].copy()
    test_df = df.iloc[validation_end:].copy()

    if validation_df.empty or test_df.empty:
        raise ValueError("Temporal split failed to create non-empty validation and test partitions.")

    return train_df, validation_df, test_df


def safe_roc_auc(y_true, y_prob) -> float | None:
    if len(np.unique(y_true)) < 2:
        return None
    return float(roc_auc_score(y_true, y_prob))


def resolve_calibration_config(y_values) -> tuple[str | None, int | None]:
    class_counts = pd.Series(y_values).value_counts()
    if len(class_counts) < 2:
        return None, None

    min_class_count = int(class_counts.min())
    if min_class_count >= 3:
        return "isotonic", min(3, min_class_count)
    if min_class_count >= 2:
        return "sigmoid", 2
    return None, None


def build_preprocessor() -> ColumnTransformer:
    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    binary_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
    ])

    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    return ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, NUMERIC_FEATURES),
            ("bin", binary_pipeline, BINARY_FEATURES),
            ("cat", categorical_pipeline, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )


def evaluate_model(model, X, y, label: str) -> dict:
    y_pred = model.predict(X)
    y_prob = model.predict_proba(X)[:, 1]
    roc_auc = safe_roc_auc(y, y_prob)
    brier_score = float(brier_score_loss(y, y_prob)) if len(y) else None

    return {
        "model": label,
        "accuracy": round(accuracy_score(y, y_pred), 4),
        "precision": round(precision_score(y, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y, y_pred, zero_division=0), 4),
        "f1": round(f1_score(y, y_pred, zero_division=0), 4),
        "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
        "brier_score": round(brier_score, 4) if brier_score is not None else None,
    }


def select_best_temporal_model(candidates, X_train, y_train, X_validation, y_validation):
    evaluations = []
    best_entry = None
    best_score = -1.0

    for model_label, pipeline in candidates:
        fitted_pipeline = clone(pipeline)
        fitted_pipeline.fit(X_train, y_train)
        validation_metrics = evaluate_model(
            fitted_pipeline,
            X_validation,
            y_validation,
            f"{model_label}_validation",
        )
        score = validation_metrics["roc_auc"]
        if score is None:
            score = validation_metrics["f1"]

        entry = {
            "label": model_label,
            "pipeline": fitted_pipeline,
            "validation_metrics": validation_metrics,
        }
        evaluations.append(entry)

        if score > best_score:
            best_entry = entry
            best_score = score

    if best_entry is None:
        raise ValueError("No temporal candidate model could be selected.")

    return best_entry, evaluations


def train_and_save(data_path: str | Path, output_dir: str | Path, use_shap: bool = True) -> None:
    data_path = Path(data_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading data from {data_path}")
    df = ensure_temporal_column(ensure_feature_columns(pd.read_csv(data_path)))
    print(f"Dataset: {len(df)} rows, {len(df.columns)} columns")
    print(f"Readmission rate: {df[TARGET].mean() * 100:.1f}%")
    print(f"Temporal split source: {df.attrs.get('event_date_source', 'unknown')}")

    train_df, validation_df, test_df = temporal_train_validation_test_split(df)
    print(
        "Temporal windows:"
        f" train={len(train_df)}"
        f" validation={len(validation_df)}"
        f" test={len(test_df)}"
    )
    print(
        "Date ranges:"
        f" train={train_df['_event_date'].min().isoformat()}..{train_df['_event_date'].max().isoformat()}"
        f" validation={validation_df['_event_date'].min().isoformat()}..{validation_df['_event_date'].max().isoformat()}"
        f" test={test_df['_event_date'].min().isoformat()}..{test_df['_event_date'].max().isoformat()}"
    )

    X_train = train_df[ALL_FEATURES].copy()
    y_train = train_df[TARGET].values
    X_validation = validation_df[ALL_FEATURES].copy()
    y_validation = validation_df[TARGET].values
    X_test = test_df[ALL_FEATURES].copy()
    y_test = test_df[TARGET].values

    lr_pipeline = Pipeline([
        ("preprocessor", build_preprocessor()),
        ("classifier", LogisticRegression(
            C=0.5,
            max_iter=1000,
            class_weight="balanced",
            solver="lbfgs",
            random_state=42,
        )),
    ])

    candidate_pipelines = [("logistic_regression", lr_pipeline)]

    if HAS_XGBOOST:
        xgb_pipeline = Pipeline([
            ("preprocessor", build_preprocessor()),
            ("classifier", xgb.XGBClassifier(
                n_estimators=100,
                max_depth=4,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                scale_pos_weight=max(1.0, (1 - df[TARGET].mean()) / max(0.01, df[TARGET].mean())),
                eval_metric="logloss",
                random_state=42,
            )),
        ])
        candidate_pipelines.append(("xgboost", xgb_pipeline))
    else:
        print("\nXGBoost not available, using Logistic Regression")

    best_entry, candidate_evaluations = select_best_temporal_model(
        candidate_pipelines,
        X_train,
        y_train,
        X_validation,
        y_validation,
    )
    best_label = best_entry["label"]

    for entry in candidate_evaluations:
        print(f"\n{entry['label']} validation metrics: {entry['validation_metrics']}")

    print(f"\n[OK] {best_label} selected using temporal validation performance")

    pipeline_map = dict(candidate_pipelines)
    combined_train_df = pd.concat([train_df, validation_df], ignore_index=True)
    X_combined = combined_train_df[ALL_FEATURES].copy()
    y_combined = combined_train_df[TARGET].values

    best_pipeline = clone(pipeline_map[best_label])
    best_pipeline.fit(X_combined, y_combined)
    train_metrics = evaluate_model(best_pipeline, X_combined, y_combined, f"{best_label}_train")
    uncalibrated_test_metrics = evaluate_model(
        best_pipeline,
        X_test,
        y_test,
        f"{best_label}_test_uncalibrated",
    )
    print(f"Combined train metrics: {train_metrics}")
    print(f"Temporal test metrics before calibration: {uncalibrated_test_metrics}")

    calibration_method, calibration_cv = resolve_calibration_config(y_combined)
    calibrated = best_pipeline
    calibration_summary = {
        "applied": False,
        "method": None,
        "cv_folds": None,
        "reason": "insufficient_class_support",
    }

    if calibration_method is not None and calibration_cv is not None:
        print(f"\nCalibrating model probabilities with {calibration_method} (cv={calibration_cv})...")
        calibrated = CalibratedClassifierCV(best_pipeline, cv=calibration_cv, method=calibration_method)
        calibrated.fit(X_combined, y_combined)
        calibration_summary = {
            "applied": True,
            "method": calibration_method,
            "cv_folds": calibration_cv,
            "reason": None,
        }
    else:
        print("\nSkipping calibration because the temporal training window does not have enough class support.")

    validation_metrics = evaluate_model(
        calibrated,
        X_validation,
        y_validation,
        f"{best_label}_validation_temporal_final",
    )
    cal_metrics = evaluate_model(
        calibrated,
        X_test,
        y_test,
        f"{best_label}_test_temporal_final",
    )
    print(f"Temporal validation metrics for shipped artifact: {validation_metrics}")
    print(f"Temporal test metrics for shipped artifact: {cal_metrics}")

    explainer = None
    if use_shap and HAS_SHAP:
        print("\nGenerating SHAP explainer...")
        try:
            X_transformed = best_pipeline.named_steps["preprocessor"].transform(X_combined)
            classifier = best_pipeline.named_steps["classifier"]

            if HAS_XGBOOST and isinstance(classifier, xgb.XGBClassifier):
                explainer = shap.TreeExplainer(classifier)
            else:
                sample_size = min(100, len(X_transformed))
                background = X_transformed[:sample_size]
                explainer = shap.KernelExplainer(classifier.predict_proba, background)
            print("[OK] SHAP explainer created")
        except Exception as e:
            print(f"[WARN] SHAP explainer creation failed: {e}")
            explainer = None
    elif not use_shap:
        print("\nSkipping SHAP explainer generation by request.")

    model_path = output_dir / "trip_readmission_model.joblib"
    explainer_path = output_dir / "trip_shap_explainer.joblib"
    metadata_path = output_dir / "model_metadata.json"
    preprocessor_path = output_dir / "trip_preprocessor.joblib"

    print(f"\nSaving model bundle to {model_path}")
    
    # Save the dictionary of sub-models instead of just one model
    bundle = {
        "global": best_pipeline,
        "disease_models": calibrated_models,
        "facility_models": facility_calibrations
    }
    joblib.dump(bundle, model_path)
    joblib.dump(best_pipeline.named_steps["preprocessor"], preprocessor_path)

    if explainer is not None:
        joblib.dump(explainer, explainer_path)

    try:
        feature_names = list(best_pipeline.named_steps["preprocessor"].get_feature_names_out())
    except Exception:
        feature_names = ALL_FEATURES

    metadata = {
        "model_version": "trip-tz-submodels-v2.1",
        "model_type": best_label,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_rows": len(df),
        "readmission_rate": round(float(df[TARGET].mean()), 4),
        "train_metrics": train_metrics,
        "validation_metrics": validation_metrics,
        "test_metrics": cal_metrics,
        "candidate_validation_metrics": {
            entry["label"]: entry["validation_metrics"] for entry in candidate_evaluations
        },
        "calibration": calibration_summary,
        "temporal_split": {
            "event_date_source": df.attrs.get("event_date_source", "unknown"),
            "train_rows": len(train_df),
            "validation_rows": len(validation_df),
            "test_rows": len(test_df),
            "train_start": train_df["_event_date"].min().isoformat(),
            "train_end": train_df["_event_date"].max().isoformat(),
            "validation_start": validation_df["_event_date"].min().isoformat(),
            "validation_end": validation_df["_event_date"].max().isoformat(),
            "test_start": test_df["_event_date"].min().isoformat(),
            "test_end": test_df["_event_date"].max().isoformat(),
        },
        "features": {
            "all": ALL_FEATURES,
            "transformed_names": feature_names,
        },
        "feature_name_map": FEATURE_NAME_MAP,
        "artifacts": {
            "model": model_path.name,
            "preprocessor": preprocessor_path.name,
            "explainer": explainer_path.name if explainer else None,
        },
    }

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, default=str)

    print(f"\n{'='*60}")
    print("Training complete!")
    print(f"  Model type:    {best_label}")
    print(f"  Val ROC AUC:   {validation_metrics.get('roc_auc')}")
    print(f"  Test ROC AUC:  {cal_metrics.get('roc_auc')}")
    print(f"  Artifacts:     {output_dir}")
    print(f"  Model file:    {model_path.name}")
    print(f"  Metadata:      {metadata_path.name}")
    print(f"{'='*60}")


def parse_args() -> argparse.Namespace:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(
        description="Train the TRIP readmission model using temporal train/validation/test windows."
    )
    parser.add_argument(
        "--data-path",
        default=str(root / "data" / "synthetic_readmission_data.csv"),
        help="CSV dataset path. Defaults to the bundled synthetic dataset.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(root / "data" / "models"),
        help="Directory where model artifacts and metadata will be written.",
    )
    parser.add_argument(
        "--skip-shap",
        action="store_true",
        help="Skip SHAP explainer generation to speed up local smoke tests.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    data_file = Path(args.data_path)
    model_dir = Path(args.output_dir)

    if not data_file.exists():
        print(f"Dataset not found at {data_file}")
        print("Run generate_synthetic_data.py first.")
        return 1

    train_and_save(data_file, model_dir, use_shap=not args.skip_shap)
    return 0


if __name__ == "__main__":
    sys.exit(main())
