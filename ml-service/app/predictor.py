from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEFAULT_ARTIFACT = {
    "model_name": "TRIP Clinical Readmission Model",
    "model_version": "trip-clinical-logit-v1",
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
    "age_scaled": "Age",
    "prior_admissions_6mo_scaled": "Recent admissions",
    "prior_admissions_12m_scaled": "Annual admissions",
    "length_of_stay_scaled": "Length of stay",
    "charlson_index_scaled": "Comorbidity burden",
    "egfr_low_severity": "Reduced kidney function",
    "anemia_severity": "Anemia marker",
    "hba1c_risk": "Poor glycemic control",
    "high_bp_flag": "Elevated blood pressure",
    "high_risk_medication_scaled": "High-risk medications",
    "icu_stay_scaled": "ICU utilization",
    "no_phone_access_flag": "No phone access",
    "transportation_difficulty_flag": "Transport barrier",
    "lives_alone_flag": "Lives alone",
    "heart_failure_flag": "Heart failure diagnosis",
    "diabetes_flag": "Diabetes diagnosis",
    "ckd_flag": "CKD diagnosis",
}

FEATURE_IMPACTS = {
    "age_scaled": "Older age increases the readmission baseline.",
    "prior_admissions_6mo_scaled": "Recent admissions suggest unstable disease control.",
    "prior_admissions_12m_scaled": "Frequent yearly admissions indicate sustained utilization risk.",
    "length_of_stay_scaled": "Longer stays often reflect clinical complexity.",
    "charlson_index_scaled": "More chronic comorbidity increases risk after discharge.",
    "egfr_low_severity": "Lower eGFR is associated with higher readmission risk.",
    "anemia_severity": "Lower hemoglobin increases post-discharge vulnerability.",
    "hba1c_risk": "Poor glycemic control raises complication and readmission risk.",
    "high_bp_flag": "Uncontrolled blood pressure raises short-term risk.",
    "high_risk_medication_scaled": "Polypharmacy and high-risk drugs increase adverse-event risk.",
    "icu_stay_scaled": "Recent ICU exposure signals higher acuity.",
    "no_phone_access_flag": "Limited phone access reduces follow-up reliability.",
    "transportation_difficulty_flag": "Transport barriers reduce ability to attend follow-up.",
    "lives_alone_flag": "Living alone may reduce post-discharge support.",
    "heart_failure_flag": "Heart failure is a strong readmission driver.",
    "diabetes_flag": "Diabetes raises chronic care complexity.",
    "ckd_flag": "CKD adds renal and medication-management risk.",
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
    return 1.0 / (1.0 + math.exp(-value))


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
    completeness = (len(CRITICAL_FIELDS) - len(missing)) / len(CRITICAL_FIELDS)
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


def engineer_features(normalized: dict[str, Any]) -> tuple[dict[str, float], dict[str, Any]]:
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


def format_factor(feature_name: str, normalized: dict[str, Any]) -> str:
    if feature_name == "age_scaled":
        return f"Age {int(round(normalized['age']))} years"
    if feature_name == "prior_admissions_6mo_scaled":
        return f"{int(round(normalized['priorAdmissions6mo']))} admission(s) in 6 months"
    if feature_name == "prior_admissions_12m_scaled":
        return f"{int(round(normalized['priorAdmissions12m']))} admission(s) in 12 months"
    if feature_name == "length_of_stay_scaled":
        return f"Length of stay {int(round(normalized['lengthOfStayDays']))} days"
    if feature_name == "charlson_index_scaled":
        return f"Charlson index {int(round(normalized['charlsonIndex']))}"
    if feature_name == "egfr_low_severity" and normalized.get("egfr") is not None:
        return f"eGFR {int(round(normalized['egfr']))}"
    if feature_name == "anemia_severity" and normalized.get("hemoglobin") is not None:
        return f"Hemoglobin {normalized['hemoglobin']:.1f} g/dL"
    if feature_name == "hba1c_risk" and normalized.get("hba1c") is not None:
        return f"HbA1c {normalized['hba1c']:.1f}%"
    if feature_name == "high_risk_medication_scaled":
        return f"{int(round(normalized['highRiskMedicationCount']))} high-risk medication(s)"
    return FEATURE_LABELS.get(feature_name, feature_name)


def build_explanation(tier: str, factors: list[dict[str, Any]]) -> str:
    if not factors:
        return "Low measured risk with limited high-impact clinical drivers."

    lead = ", ".join(factor["factor"] for factor in factors[:3])
    if tier == "High":
        return f"High readmission risk driven by {lead}."
    if tier == "Medium":
        return f"Medium readmission risk influenced by {lead}."
    return f"Lower predicted risk; the strongest observed drivers are {lead}."


@dataclass
class ModelArtifact:
    payload: dict[str, Any]
    source: str

    @property
    def model_version(self) -> str:
        return str(self.payload.get("model_version", "trip-clinical-logit-v1"))

    @property
    def model_type(self) -> str:
        return str(self.payload.get("model_type", "logistic_regression_surrogate"))

    @property
    def intercept(self) -> float:
        return float(self.payload.get("intercept", -3.2))

    @property
    def thresholds(self) -> dict[str, float]:
        return dict(self.payload.get("score_thresholds", {"medium": 0.40, "high": 0.70}))

    @property
    def interval_width(self) -> float:
        return float(self.payload.get("confidence_interval_width", 0.12))

    @property
    def feature_weights(self) -> dict[str, float]:
        return {
            key: float(value)
            for key, value in dict(self.payload.get("feature_weights", {})).items()
        }

    @classmethod
    def load(cls, artifact_path: Path) -> "ModelArtifact":
        if artifact_path.exists():
            with artifact_path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
            return cls(payload=payload, source="file")

        return cls(payload=DEFAULT_ARTIFACT, source="builtin")


class TripPredictor:
    def __init__(self, artifact_path: Path) -> None:
        self.artifact = ModelArtifact.load(artifact_path)

    def health(self) -> dict[str, Any]:
        return {
            "status": "healthy",
            "model_loaded": True,
            "explainer_loaded": True,
            "model_version": self.artifact.model_version,
            "model_type": self.artifact.model_type,
            "artifact_source": self.artifact.source,
        }

    def predict(self, visit_id: str | None, raw_features: dict[str, Any]) -> dict[str, Any]:
        normalized = normalize_features(raw_features)
        data_quality = compute_data_quality(normalized)
        engineered, derived = engineer_features(normalized)

        weighted_contributions: list[tuple[str, float]] = []
        logit = self.artifact.intercept

        for feature_name, feature_value in engineered.items():
            weight = self.artifact.feature_weights.get(feature_name, 0.0)
            contribution = weight * feature_value
            logit += contribution
            if abs(contribution) > 0:
                weighted_contributions.append((feature_name, contribution))

        probability = round_probability(sigmoid(logit))
        score = int(round(probability * 100))
        tier = score_to_tier(probability, self.artifact.thresholds)

        margin = abs(probability - 0.5) * 2.0
        confidence = clamp(
            0.56 + data_quality["completeness"] * 0.24 + margin * 0.15,
            0.50,
            0.95,
        )
        confidence = round(confidence, 3)

        interval_width = self.artifact.interval_width + (
            (1.0 - data_quality["completeness"]) * 0.10
        )
        low_score = int(round(clamp(probability - interval_width, 0.0, 1.0) * 100))
        high_score = int(round(clamp(probability + interval_width, 0.0, 1.0) * 100))

        total_abs = sum(abs(item[1]) for item in weighted_contributions) or 1.0
        factors = []
        for feature_name, contribution in sorted(
            weighted_contributions, key=lambda item: abs(item[1]), reverse=True
        )[:5]:
            factors.append(
                {
                    "factor": format_factor(feature_name, normalized),
                    "weight": round(abs(contribution) / total_abs, 3),
                    "contribution": round(contribution, 3),
                    "direction": "increase" if contribution >= 0 else "decrease",
                    "impact": FEATURE_IMPACTS.get(feature_name, "Clinical factor contribution."),
                }
            )

        analysis_summary = {
            "labAbnormalities": derived["labAbnormalities"],
            "socialRiskFlags": derived["socialRiskFlags"],
            "diagnoses": derived["diagnoses"],
            "missingCriticalFields": data_quality["missingCriticalFields"],
            "utilizationRiskLevel": (
                "high"
                if normalized["priorAdmissions12m"] >= 3
                else "moderate"
                if normalized["priorAdmissions12m"] >= 1
                else "low"
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
            "modelVersion": self.artifact.model_version,
            "modelType": self.artifact.model_type,
            "method": "ml",
            "dataQuality": data_quality,
            "analysisSummary": analysis_summary,
        }
