#!/usr/bin/env python3
"""
Train a readmission prediction model using the synthetic clinical dataset.

Pipeline:
1. Load CSV dataset
2. Preprocess features (imputation, encoding, scaling)
3. Train Logistic Regression baseline + XGBoost
4. Stratified K-fold cross-validation
5. Calibration via CalibratedClassifierCV
6. Generate SHAP explainer
7. Save model artifacts (joblib) + metadata (JSON)
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score
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


# Feature name mapping: model feature name -> API request feature name
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

    metrics = {
        "model": label,
        "accuracy": round(accuracy_score(y, y_pred), 4),
        "precision": round(precision_score(y, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y, y_pred, zero_division=0), 4),
        "f1": round(f1_score(y, y_pred, zero_division=0), 4),
        "roc_auc": round(roc_auc_score(y, y_prob), 4),
    }
    return metrics


def train_and_save(data_path: str | Path, output_dir: str | Path) -> None:
    data_path = Path(data_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading data from {data_path}")
    df = ensure_feature_columns(pd.read_csv(data_path))
    print(f"Dataset: {len(df)} rows, {len(df.columns)} columns")
    print(f"Readmission rate: {df[TARGET].mean() * 100:.1f}%")

    X = df[ALL_FEATURES].copy()
    y = df[TARGET].values

    # Build preprocessor
    preprocessor = build_preprocessor()

    # --- Model 1: Logistic Regression ---
    lr_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", LogisticRegression(
            C=0.5,
            max_iter=1000,
            class_weight="balanced",
            solver="lbfgs",
            random_state=42,
        )),
    ])

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    lr_cv_scores = cross_val_score(lr_pipeline, X, y, cv=cv, scoring="roc_auc")
    print(f"\nLogistic Regression CV AUC: {lr_cv_scores.mean():.4f} ± {lr_cv_scores.std():.4f}")

    lr_pipeline.fit(X, y)
    lr_metrics = evaluate_model(lr_pipeline, X, y, "LogisticRegression")
    print(f"LR Train metrics: {lr_metrics}")

    # --- Model 2: XGBoost (if available) ---
    best_pipeline = lr_pipeline
    best_label = "logistic_regression"
    best_metrics = lr_metrics
    best_cv_auc = lr_cv_scores.mean()

    if HAS_XGBOOST:
        xgb_pipeline = Pipeline([
            ("preprocessor", build_preprocessor()),
            ("classifier", xgb.XGBClassifier(
                n_estimators=200,
                max_depth=5,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                scale_pos_weight=max(1.0, (1 - df[TARGET].mean()) / df[TARGET].mean()),
                eval_metric="logloss",
                random_state=42,
                use_label_encoder=False,
            )),
        ])

        xgb_cv_scores = cross_val_score(xgb_pipeline, X, y, cv=cv, scoring="roc_auc")
        print(f"\nXGBoost CV AUC: {xgb_cv_scores.mean():.4f} ± {xgb_cv_scores.std():.4f}")

        xgb_pipeline.fit(X, y)
        xgb_metrics = evaluate_model(xgb_pipeline, X, y, "XGBClassifier")
        print(f"XGB Train metrics: {xgb_metrics}")

        if xgb_cv_scores.mean() > lr_cv_scores.mean():
            best_pipeline = xgb_pipeline
            best_label = "xgboost"
            best_metrics = xgb_metrics
            best_cv_auc = xgb_cv_scores.mean()
            print("\n[OK] XGBoost selected as best model")
        else:
            print("\n[OK] Logistic Regression selected as best model")
    else:
        print("\nXGBoost not available, using Logistic Regression")

    # --- Calibration ---
    print("\nCalibrating model probabilities...")
    calibrated = CalibratedClassifierCV(best_pipeline, cv=3, method="isotonic")
    calibrated.fit(X, y)

    cal_metrics = evaluate_model(calibrated, X, y, f"{best_label}_calibrated")
    print(f"Calibrated metrics: {cal_metrics}")

    # --- SHAP Explainer ---
    explainer = None
    if HAS_SHAP:
        print("\nGenerating SHAP explainer...")
        try:
            X_transformed = best_pipeline.named_steps["preprocessor"].transform(X)
            classifier = best_pipeline.named_steps["classifier"]

            if HAS_XGBOOST and isinstance(classifier, xgb.XGBClassifier):
                explainer = shap.TreeExplainer(classifier)
            else:
                # Use a sample for KernelExplainer (faster)
                sample_size = min(100, len(X_transformed))
                background = X_transformed[:sample_size]
                explainer = shap.KernelExplainer(
                    classifier.predict_proba,
                    background,
                )
            print("[OK] SHAP explainer created")
        except Exception as e:
            print(f"⚠ SHAP explainer creation failed: {e}")
            explainer = None

    # --- Save Artifacts ---
    model_path = output_dir / "trip_readmission_model.joblib"
    explainer_path = output_dir / "trip_shap_explainer.joblib"
    metadata_path = output_dir / "model_metadata.json"
    preprocessor_path = output_dir / "trip_preprocessor.joblib"

    print(f"\nSaving model to {model_path}")
    joblib.dump(calibrated, model_path)
    joblib.dump(best_pipeline.named_steps["preprocessor"], preprocessor_path)

    if explainer is not None:
        print(f"Saving SHAP explainer to {explainer_path}")
        joblib.dump(explainer, explainer_path)

    # Get feature names after preprocessing
    try:
        feature_names = list(
            best_pipeline.named_steps["preprocessor"].get_feature_names_out()
        )
    except Exception:
        feature_names = ALL_FEATURES

    metadata = {
        "model_version": "trip-clinical-v2.0",
        "model_type": best_label,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_rows": len(df),
        "readmission_rate": round(float(df[TARGET].mean()), 4),
        "cv_auc_mean": round(float(best_cv_auc), 4),
        "train_metrics": best_metrics,
        "calibrated_metrics": cal_metrics,
        "features": {
            "numeric": NUMERIC_FEATURES,
            "binary": BINARY_FEATURES,
            "categorical": CATEGORICAL_FEATURES,
            "all": ALL_FEATURES,
            "transformed_names": feature_names,
        },
        "feature_name_map": FEATURE_NAME_MAP,
        "artifacts": {
            "model": model_path.name,
            "preprocessor": preprocessor_path.name,
            "explainer": explainer_path.name if explainer else None,
            "metadata": metadata_path.name,
        },
    }

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, default=str)

    print(f"\n{'='*60}")
    print(f"Training complete!")
    print(f"  Model type:    {best_label}")
    print(f"  CV AUC:        {best_cv_auc:.4f}")
    print(f"  Artifacts:     {output_dir}")
    print(f"  Model file:    {model_path.name}")
    print(f"  Metadata:      {metadata_path.name}")
    print(f"{'='*60}")


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    data_file = root / "data" / "synthetic_readmission_data.csv"
    model_dir = root / "data" / "models"

    if not data_file.exists():
        print(f"Dataset not found at {data_file}")
        print("Run generate_synthetic_data.py first.")
        sys.exit(1)

    train_and_save(data_file, model_dir)
