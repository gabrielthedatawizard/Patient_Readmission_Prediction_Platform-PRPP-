from __future__ import annotations

import json
import logging
import math
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

try:
    import joblib
    HAS_JOBLIB = True
except ImportError:
    HAS_JOBLIB = False

logger = logging.getLogger(__name__)


DEFAULT_ARTIFACT = {
    "model_name": "TRIP Clinical Readmission Model",
    "model_version": "trip-clinical-logit-fallback-v1",
    "model_type": "logistic_regression_surrogate",
    "artifact_source": "builtin",
    "intercept": -3.2,
    "score_thresholds": {"medium": 0.40, "high": 0.70},
    "confidence_interval_width": 0.12,
    "feature_weights": {
        "age_scaled": 0.55,
        "prior_admissions_6mo_scaled": 0.45,
        "prior_admissions_12m_scaled": 0.40,
        "length_of_stay_scaled": 0.28,
        "charlson_index_scaled": 0.32,
        "egfr_low_severity": 0.62,
        "anemia_severity": 0.44,
        "hba1c_risk": 0.30,
        "high_bp_flag": 0.22,
        "high_risk_medication_scaled": 0.26,
        "icu_stay_scaled": 0.29,
        "no_phone_access_flag": 0.38,
        "transportation_difficulty_flag": 0.42,
        "lives_alone_flag": 0.18,
        "heart_failure_flag": 0.65,
        "diabetes_flag": 0.20,
        "ckd_flag": 0.34,
    },
}

FEATURE_LABELS = {
    "age": "Age",
    "prior_admissions_12m": "Annual admissions",
    "length_of_stay_days": "Length of stay",
    "charlson_index": "Comorbidity burden",
    "egfr": "Kidney function (eGFR)",
    "hemoglobin": "Hemoglobin",
    "hba1c": "Glycemic control (HbA1c)",
    "bp_systolic": "Systolic BP",
    "bp_diastolic": "Diastolic BP",
    "high_risk_medication_count": "High-risk medications",
    "icu_stay_days": "ICU utilization",
    "phone_access": "Phone access",
    "transportation_difficulty": "Transport barrier",
    "lives_alone": "Lives alone",
    "has_heart_failure": "Heart failure diagnosis",
    "has_diabetes": "Diabetes diagnosis",
    "has_ckd": "CKD diagnosis",
    "gender": "Gender",
}

FEATURE_IMPACTS = {
    "age": "Age is a baseline risk factor.",
    "prior_admissions_12m": "Frequent admissions indicate sustained utilization risk.",
    "length_of_stay_days": "Longer stays reflect clinical complexity.",
    "charlson_index": "Chronic comorbidity increases post-discharge risk.",
    "egfr": "Reduced eGFR is associated with higher readmission risk.",
    "hemoglobin": "Low hemoglobin increases post-discharge vulnerability.",
    "hba1c": "Poor glycemic control raises complication risk.",
    "bp_systolic": "Blood pressure affects short-term risk.",
    "bp_diastolic": "Blood pressure affects short-term risk.",
    "high_risk_medication_count": "Polypharmacy increases adverse-event risk.",
    "icu_stay_days": "Recent ICU exposure signals higher acuity.",
    "phone_access": "Lack of phone access reduces follow-up reliability.",
    "transportation_difficulty": "Transport barriers reduce inability to attend follow-up.",
    "lives_alone": "Living alone may reduce post-discharge support.",
    "has_heart_failure": "Heart failure is a strong readmission driver.",
    "has_diabetes": "Diabetes raises chronic care complexity.",
    "has_ckd": "CKD adds renal and medication-management risk.",
    "gender": "Gender is a baseline demographic factor.",
}

CRITICAL_FIELDS = ("egfr", "hemoglobin", "hba1c", "bpSystolic", "bpDiastolic")


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def to_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    return numeric if math.isfinite(numeric) else None


def to_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    normalized = str(value).strip().lower()
    if normalized in {"true", "1", "yes", "y"}:
        return True
    if normalized in {"false", "0", "no", "n"}:
        return False
    return default


def normalize_string_list(value: Any) -> list[str]:
    if value is None or value == "":
        return []

    if isinstance(value, list):
        items = value
    else:
        items = str(value).split(",")

    normalized: list[str] = []
    for item in items:
        if isinstance(item, dict):
            text = item.get("code") or item.get("name") or item.get("label")
        else:
            text = item
        if text is None:
            continue
        stripped = str(text).strip()
        if stripped:
            normalized.append(stripped)

    return normalized


def sigmoid(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(min(value, 20), -20)))


def round_probability(value: float) -> float:
    return round(clamp(value, 0.0, 1.0), 3)


def score_to_tier(probability: float, thresholds: dict[str, float]) -> str:
    if probability >= thresholds.get("high", 0.70):
        return "High"
    if probability >= thresholds.get("medium", 0.40):
        return "Medium"
    return "Low"


def compute_data_quality(normalized: dict[str, Any]) -> dict[str, Any]:
    missing = [field for field in CRITICAL_FIELDS if normalized.get(field) is None]
    completeness = (len(CRITICAL_FIELDS) - len(missing)) / max(1, len(CRITICAL_FIELDS))
    return {
        "completeness": round(completeness, 3),
        "missingCriticalFields": missing,
        "imputedValues": {},
    }


def derive_condition_flags(features: dict[str, Any], diagnoses: list[str]) -> dict[str, bool]:
    diagnosis_text = " ".join(diagnoses).upper()
    return {
        "hasHeartFailure": to_bool(
            features.get("hasHeartFailure"), "I50" in diagnosis_text
        ),
        "hasDiabetes": to_bool(
            features.get("hasDiabetes"),
            any(code in diagnosis_text for code in ("E10", "E11", "E13", "O24")),
        ),
        "hasCkd": to_bool(features.get("hasCkd"), "N18" in diagnosis_text),
    }


def normalize_features(raw_features: dict[str, Any]) -> dict[str, Any]:
    diagnoses = normalize_string_list(
        raw_features.get("diagnoses") or raw_features.get("diagnosis")
    )
    condition_flags = derive_condition_flags(raw_features, diagnoses)

    return {
        "age": clamp(to_float(raw_features.get("age")) or 0.0, 18.0, 95.0),
        "gender": str(raw_features.get("gender") or "unknown").lower(),
        "diagnosis": str(raw_features.get("diagnosis") or (diagnoses[0] if diagnoses else "unknown")),
        "diagnoses": diagnoses,
        "priorAdmissions6mo": clamp(
            to_float(raw_features.get("priorAdmissions6mo")) or 0.0, 0.0, 10.0
        ),
        "priorAdmissions12m": clamp(
            to_float(raw_features.get("priorAdmissions12m")) or 0.0, 0.0, 12.0
        ),
        "lengthOfStayDays": clamp(
            to_float(raw_features.get("lengthOfStayDays") or raw_features.get("lengthOfStay"))
            or 0.0,
            0.0,
            30.0,
        ),
        "charlsonIndex": clamp(
            to_float(raw_features.get("charlsonIndex")) or 0.0, 0.0, 12.0
        ),
        "egfr": to_float(raw_features.get("egfr")),
        "hemoglobin": to_float(raw_features.get("hemoglobin")),
        "hba1c": to_float(raw_features.get("hba1c")),
        "bpSystolic": to_float(raw_features.get("bpSystolic")),
        "bpDiastolic": to_float(raw_features.get("bpDiastolic")),
        "medicationCount": clamp(
            to_float(raw_features.get("medicationCount")) or 0.0, 0.0, 20.0
        ),
        "highRiskMedicationCount": clamp(
            to_float(raw_features.get("highRiskMedicationCount")) or 0.0, 0.0, 8.0
        ),
        "icuStayDays": clamp(
            to_float(raw_features.get("icuStayDays")) or 0.0, 0.0, 10.0
        ),
        "phoneAccess": to_bool(raw_features.get("phoneAccess"), True),
        "transportationDifficulty": to_bool(
            raw_features.get("transportationDifficulty"), False
        ),
        "livesAlone": to_bool(raw_features.get("livesAlone"), False),
        **condition_flags,
    }


def extract_ml_features(normalized: dict[str, Any]) -> dict[str, Any]:
    # Maps to the pipeline features required by train_model.py
    return {
        "age": normalized["age"],
        "gender": normalized["gender"],
        "prior_admissions_12m": normalized["priorAdmissions12m"],
        "length_of_stay_days": normalized["lengthOfStayDays"],
        "charlson_index": normalized["charlsonIndex"],
        "egfr": normalized.get("egfr", np.nan),
        "hemoglobin": normalized.get("hemoglobin", np.nan),
        "hba1c": normalized.get("hba1c", np.nan),
        "bp_systolic": normalized.get("bpSystolic", np.nan),
        "bp_diastolic": normalized.get("bpDiastolic", np.nan),
        "high_risk_medication_count": normalized["highRiskMedicationCount"],
        "icu_stay_days": normalized["icuStayDays"],
        "phone_access": int(normalized["phoneAccess"]),
        "transportation_difficulty": int(normalized["transportationDifficulty"]),
        "lives_alone": int(normalized["livesAlone"]),
        "has_heart_failure": int(normalized["hasHeartFailure"]),
        "has_diabetes": int(normalized["hasDiabetes"]),
        "has_ckd": int(normalized["hasCkd"]),
    }


def extract_surrogate_features(normalized: dict[str, Any]) -> tuple[dict[str, float], dict[str, Any]]:
    egfr = normalized.get("egfr")
    hemoglobin = normalized.get("hemoglobin")
    hba1c = normalized.get("hba1c")
    bp_systolic = normalized.get("bpSystolic")
    bp_diastolic = normalized.get("bpDiastolic")

    engineered = {
        "age_scaled": round(max(normalized["age"] - 18.0, 0.0) / 60.0, 4),
        "prior_admissions_6mo_scaled": round(normalized["priorAdmissions6mo"] / 2.0, 4),
        "prior_admissions_12m_scaled": round(normalized["priorAdmissions12m"] / 3.0, 4),
        "length_of_stay_scaled": round(normalized["lengthOfStayDays"] / 7.0, 4),
        "charlson_index_scaled": round(normalized["charlsonIndex"] / 2.5, 4),
        "egfr_low_severity": round(
            max((60.0 - egfr) / 25.0, 0.0) if egfr is not None else 0.0, 4
        ),
        "anemia_severity": round(
            max((10.5 - hemoglobin) / 1.5, 0.0) if hemoglobin is not None else 0.0, 4
        ),
        "hba1c_risk": round(max((hba1c - 8.0) / 2.0, 0.0) if hba1c is not None else 0.0, 4),
        "high_bp_flag": 1.0
        if (
            (bp_systolic is not None and bp_systolic >= 150)
            or (bp_diastolic is not None and bp_diastolic >= 95)
        )
        else 0.0,
        "high_risk_medication_scaled": round(
            normalized["highRiskMedicationCount"] / 2.0, 4
        ),
        "icu_stay_scaled": round(normalized["icuStayDays"] / 2.5, 4),
        "no_phone_access_flag": 0.0 if normalized["phoneAccess"] else 1.0,
        "transportation_difficulty_flag": 1.0
        if normalized["transportationDifficulty"]
        else 0.0,
        "lives_alone_flag": 1.0 if normalized["livesAlone"] else 0.0,
        "heart_failure_flag": 1.0 if normalized["hasHeartFailure"] else 0.0,
        "diabetes_flag": 1.0 if normalized["hasDiabetes"] else 0.0,
        "ckd_flag": 1.0 if normalized["hasCkd"] else 0.0,
    }

    lab_abnormalities: list[str] = []
    if egfr is not None and egfr < 60:
        lab_abnormalities.append("reduced_kidney_function")
    if hemoglobin is not None and hemoglobin < 10:
        lab_abnormalities.append("anemia")
    if hba1c is not None and hba1c >= 8.5:
        lab_abnormalities.append("poor_glycemic_control")

    social_risk_flags: list[str] = []
    if not normalized["phoneAccess"]:
        social_risk_flags.append("no_phone_access")
    if normalized["transportationDifficulty"]:
        social_risk_flags.append("transport_barrier")
    if normalized["livesAlone"]:
        social_risk_flags.append("lives_alone")

    derived = {
        "labAbnormalities": lab_abnormalities,
        "socialRiskFlags": social_risk_flags,
        "diagnoses": normalized["diagnoses"],
    }

    return engineered, derived


def format_factor(feature_name: str, val: Any) -> str:
    name = FEATURE_LABELS.get(feature_name, feature_name)
    if pd.isna(val):
        return name
    if isinstance(val, float):
        return f"{name} ({val:.1f})"
    return f"{name} ({val})"


def build_explanation(tier: str, factors: list[dict[str, Any]]) -> str:
    if not factors:
        return "Low measured risk with limited high-impact clinical drivers."

    lead = ", ".join(factor["factor"] for factor in factors[:3])
    if tier == "High":
        return f"High readmission risk driven by {lead}."
    if tier == "Medium":
        return f"Medium readmission risk influenced by {lead}."
    return f"Lower predicted risk; the strongest observed drivers are {lead}."


class TripPredictor:
    def __init__(self, model_dir: Path) -> None:
        self.model_dir = model_dir
        self.model = None
        self.explainer = None
        self.metadata = DEFAULT_ARTIFACT.copy()
        self.is_fallback = True

        if HAS_JOBLIB and model_dir.exists():
            try:
                model_path = model_dir / "trip_readmission_model.joblib"
                explainer_path = model_dir / "trip_shap_explainer.joblib"
                metadata_path = model_dir / "model_metadata.json"

                if model_path.exists():
                    self.model = joblib.load(model_path)
                    self.is_fallback = False
                    logger.info(f"Loaded ML model from {model_path}")

                if explainer_path.exists():
                    self.explainer = joblib.load(explainer_path)
                    logger.info(f"Loaded SHAP explainer from {explainer_path}")

                if metadata_path.exists():
                    with open(metadata_path, "r", encoding="utf-8") as f:
                        self.metadata = json.load(f)
                    self.metadata["artifact_source"] = "file"
            except Exception as e:
                logger.error(f"Failed to load ML artifacts: {e}")
                self.is_fallback = True

    def health(self) -> dict[str, Any]:
        return {
            "status": "healthy",
            "model_loaded": self.model is not None,
            "explainer_loaded": self.explainer is not None,
            "model_version": self.metadata.get("model_version", "unknown"),
            "model_type": self.metadata.get("model_type", "unknown"),
            "artifact_source": self.metadata.get("artifact_source", "builtin"),
        }

    def predict(self, visit_id: str | None, raw_features: dict[str, Any]) -> dict[str, Any]:
        normalized = normalize_features(raw_features)
        data_quality = compute_data_quality(normalized)

        if self.is_fallback:
            return self._predict_fallback(visit_id, normalized, data_quality)

        return self._predict_ml(visit_id, normalized, data_quality)

    def _predict_fallback(self, visit_id: str | None, normalized: dict[str, Any], data_quality: dict[str, Any]) -> dict[str, Any]:
        engineered, derived = extract_surrogate_features(normalized)
        weighted_contributions: list[tuple[str, float]] = []
        logit = self.metadata.get("intercept", -3.2)
        weights = self.metadata.get("feature_weights", {})

        for feature_name, feature_value in engineered.items():
            weight = weights.get(feature_name, 0.0)
            contribution = weight * feature_value
            logit += contribution
            if abs(contribution) > 0:
                weighted_contributions.append((feature_name, contribution))

        probability = round_probability(sigmoid(logit))
        score = int(round(probability * 100))
        tier = score_to_tier(probability, self.metadata.get("score_thresholds", {"medium": 0.4, "high": 0.7}))

        margin = abs(probability - 0.5) * 2.0
        confidence = clamp(0.56 + data_quality["completeness"] * 0.24 + margin * 0.15, 0.50, 0.95)
        confidence = round(confidence, 3)

        interval_width = self.metadata.get("confidence_interval_width", 0.12) + ((1.0 - data_quality["completeness"]) * 0.10)
        low_score = int(round(clamp(probability - interval_width, 0.0, 1.0) * 100))
        high_score = int(round(clamp(probability + interval_width, 0.0, 1.0) * 100))

        total_abs = sum(abs(item[1]) for item in weighted_contributions) or 1.0
        factors = []
        for feature_name, contribution in sorted(weighted_contributions, key=lambda item: abs(item[1]), reverse=True)[:5]:
            factors.append(
                {
                    "factor": FEATURE_LABELS.get(feature_name, feature_name),
                    "weight": round(abs(contribution) / total_abs, 3),
                    "contribution": round(contribution, 3),
                    "direction": "increase" if contribution >= 0 else "decrease",
                    "impact": FEATURE_IMPACTS.get(feature_name, "Clinical factor contribution."),
                }
            )

        analysis_summary = {
            "labAbnormalities": derived.get("labAbnormalities", []),
            "socialRiskFlags": derived.get("socialRiskFlags", []),
            "diagnoses": derived.get("diagnoses", []),
            "missingCriticalFields": data_quality["missingCriticalFields"],
            "utilizationRiskLevel": (
                "high" if normalized["priorAdmissions12m"] >= 3 else "moderate" if normalized["priorAdmissions12m"] >= 1 else "low"
            ),
            "recommendedReview": tier == "High" or data_quality["completeness"] < 0.7,
        }

        return {
            "visitId": visit_id,
            "score": score,
            "tier": tier,
            "probability": probability,
            "confidence": confidence,
            "confidenceInterval": {"low": low_score, "high": high_score},
            "factors": factors,
            "explanation": build_explanation(tier, factors),
            "modelVersion": self.metadata.get("model_version", "unknown"),
            "modelType": self.metadata.get("model_type", "unknown"),
            "method": "rules",
            "fallbackUsed": True,
            "dataQuality": data_quality,
            "analysisSummary": analysis_summary,
        }

    def _predict_ml(self, visit_id: str | None, normalized: dict[str, Any], data_quality: dict[str, Any]) -> dict[str, Any]:
        ml_features = extract_ml_features(normalized)
        df = pd.DataFrame([ml_features])

        # Replace None with np.nan for sklearn
        df.fillna(value=np.nan, inplace=True)

        probability = float(self.model.predict_proba(df)[0, 1])
        score = int(round(probability * 100))
        tier = score_to_tier(probability, {"medium": 0.4, "high": 0.7})

        margin = abs(probability - 0.5) * 2.0
        confidence = clamp(0.70 + data_quality["completeness"] * 0.20 + margin * 0.10, 0.50, 0.95)
        confidence = round(confidence, 3)

        interval_width = 0.10 + ((1.0 - data_quality["completeness"]) * 0.10)
        low_score = int(round(clamp(probability - interval_width, 0.0, 1.0) * 100))
        high_score = int(round(clamp(probability + interval_width, 0.0, 1.0) * 100))

        factors = []
        if self.explainer is not None:
            try:
                # Need to use the preprocessor to transform features for the explainer
                # unless the explainer uses the untransformed dataframe directly.
                # In train_model.py, we created the explainer on X_transformed (for non-XGBoost)
                # or the model natively (for XGBoost).
                # To be safe, let's just use naive feature importance if explainer fails.
                
                # Check if it's TreeExplainer or KernelExplainer
                if hasattr(self.explainer, "expected_value"):
                    # For TreeExplainer on XGBoost
                    if "preprocessor" in self.model.named_steps:
                        X_trans = self.model.named_steps["preprocessor"].transform(df)
                        shap_values = self.explainer.shap_values(X_trans)
                    else:
                        shap_values = self.explainer.shap_values(df)
                    
                    if isinstance(shap_values, list): # For multi-class, though ours is binary
                        shap_values = shap_values[1]
                        
                    shap_vals = shap_values[0]
                    
                    try:
                        feature_names = self.model.named_steps["preprocessor"].get_feature_names_out()
                    except:
                        feature_names = df.columns

                    contributions = list(zip(feature_names, shap_vals))
                    contributions.sort(key=lambda x: abs(x[1]), reverse=True)
                    
                    total_abs = sum(abs(item[1]) for item in contributions) or 1.0
                    
                    for fname, contrib in contributions[:5]:
                        # Strip standard prefixes from feature names if present (e.g. num__, cat__)
                        clean_fname = fname.split("__")[-1] if "__" in fname else fname
                        
                        original_val = ml_features.get(clean_fname, "")
                        direction = "increase" if contrib >= 0 else "decrease"
                        factors.append({
                            "factor": format_factor(clean_fname, original_val),
                            "weight": round(abs(contrib) / total_abs, 3),
                            "contribution": round(contrib, 3),
                            "direction": direction,
                            "impact": FEATURE_IMPACTS.get(clean_fname, f"Model impact: {direction} risk."),
                        })
            except Exception as e:
                logger.error(f"SHAP explanation failed: {e}")
                
        # If SHAP failed or no explainer
        if not factors:
            factors.append({
                "factor": "Risk calculated from clinical profile via ML model",
                "weight": 1.0,
                "contribution": 0.0,
                "direction": "increase",
                "impact": "Aggregated ML risk score.",
            })

        _, derived = extract_surrogate_features(normalized)
        analysis_summary = {
            "labAbnormalities": derived.get("labAbnormalities", []),
            "socialRiskFlags": derived.get("socialRiskFlags", []),
            "diagnoses": derived.get("diagnoses", []),
            "missingCriticalFields": data_quality["missingCriticalFields"],
            "utilizationRiskLevel": (
                "high" if normalized["priorAdmissions12m"] >= 3 else "moderate" if normalized["priorAdmissions12m"] >= 1 else "low"
            ),
            "recommendedReview": tier == "High" or data_quality["completeness"] < 0.7,
        }

        return {
            "visitId": visit_id,
            "score": score,
            "tier": tier,
            "probability": probability,
            "confidence": confidence,
            "confidenceInterval": {"low": low_score, "high": high_score},
            "factors": factors,
            "explanation": build_explanation(tier, factors),
            "modelVersion": self.metadata.get("model_version", "unknown"),
            "modelType": self.metadata.get("model_type", "unknown"),
            "method": "ml",
            "fallbackUsed": False,
            "dataQuality": data_quality,
            "analysisSummary": analysis_summary,
        }
