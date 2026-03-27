from __future__ import annotations

import json
import logging
import math
from copy import deepcopy
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

ART_MEDICATION_PATTERNS = (
    "dolutegravir",
    "tenofovir",
    "lamivudine",
    "efavirenz",
    "zidovudine",
    "abacavir",
    "lopinavir",
    "ritonavir",
    "atazanavir",
    "nevirapine",
    "emtricitabine",
)

TANZANIA_PRIORITY_PREFIXES = {
    "malaria": ("B50", "B51", "B52", "B53", "B54", "P37.3"),
    "hiv": ("B20", "B21", "B22", "B23", "B24", "Z21", "R75"),
    "tuberculosis": ("A15", "A16", "A17", "A18", "A19"),
    "severe_acute_malnutrition": ("E40", "E41", "E42", "E43"),
    "sickle_cell_disease": ("D57",),
    "neonatal": ("P", "Z38"),
}

NEONATAL_WARD_PATTERNS = ("nicu", "neonat", "newborn", "scbu", "special care baby")

DEFAULT_ARTIFACT = {
    "model_name": "TRIP Clinical Readmission Model",
    "model_version": "trip-clinical-logit-fallback-v2",
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
        "malaria_flag": 0.22,
        "hiv_flag": 0.48,
        "art_gap_flag": 0.24,
        "tb_flag": 0.44,
        "sam_flag": 0.58,
        "sickle_cell_flag": 0.30,
        "neonatal_risk_flag": 0.62,
    },
}

FEATURE_LABELS = {
    "age": "Age",
    "age_scaled": "Advanced age",
    "prior_admissions_12m": "Annual admissions",
    "prior_admissions_12m_scaled": "Annual admissions burden",
    "prior_admissions_6mo_scaled": "Recent admissions burden",
    "length_of_stay_days": "Length of stay",
    "length_of_stay_scaled": "Prolonged stay burden",
    "charlson_index": "Comorbidity burden",
    "charlson_index_scaled": "Comorbidity burden",
    "egfr": "Kidney function (eGFR)",
    "egfr_low_severity": "Reduced kidney function",
    "hemoglobin": "Hemoglobin",
    "anemia_severity": "Anemia severity",
    "hba1c": "Glycemic control (HbA1c)",
    "hba1c_risk": "Poor glycemic control",
    "bp_systolic": "Systolic BP",
    "bp_diastolic": "Diastolic BP",
    "high_bp_flag": "Severely elevated blood pressure",
    "high_risk_medication_count": "High-risk medications",
    "high_risk_medication_scaled": "High-risk medication burden",
    "icu_stay_days": "ICU utilization",
    "icu_stay_scaled": "ICU exposure",
    "phone_access": "Phone access",
    "no_phone_access_flag": "No phone access",
    "transportation_difficulty": "Transport barrier",
    "transportation_difficulty_flag": "Transport barrier",
    "lives_alone": "Lives alone",
    "lives_alone_flag": "Lives alone",
    "has_heart_failure": "Heart failure diagnosis",
    "heart_failure_flag": "Heart failure diagnosis",
    "has_diabetes": "Diabetes diagnosis",
    "diabetes_flag": "Diabetes diagnosis",
    "has_ckd": "CKD diagnosis",
    "ckd_flag": "CKD diagnosis",
    "has_malaria": "Malaria diagnosis",
    "malaria_flag": "Malaria diagnosis",
    "has_hiv": "HIV diagnosis",
    "hiv_flag": "HIV diagnosis",
    "on_art": "ART treatment",
    "art_gap_flag": "HIV without ART coverage",
    "has_tuberculosis": "Tuberculosis diagnosis",
    "tb_flag": "Tuberculosis diagnosis",
    "has_severe_acute_malnutrition": "Severe acute malnutrition",
    "sam_flag": "Severe acute malnutrition",
    "has_sickle_cell_disease": "Sickle cell disease",
    "sickle_cell_flag": "Sickle cell disease",
    "neonatal_risk": "Neonatal risk",
    "neonatal_risk_flag": "Neonatal risk",
    "gender": "Gender",
}

FEATURE_IMPACTS = {
    "age": "Age is a baseline risk factor.",
    "age_scaled": "Advanced age can increase discharge complexity.",
    "prior_admissions_12m": "Frequent admissions indicate sustained utilization risk.",
    "prior_admissions_12m_scaled": "Frequent admissions indicate sustained utilization risk.",
    "prior_admissions_6mo_scaled": "Repeated recent admissions suggest unresolved instability.",
    "length_of_stay_days": "Longer stays reflect clinical complexity.",
    "length_of_stay_scaled": "Longer stays reflect clinical complexity.",
    "charlson_index": "Chronic comorbidity increases post-discharge risk.",
    "charlson_index_scaled": "Chronic comorbidity increases post-discharge risk.",
    "egfr": "Reduced eGFR is associated with higher readmission risk.",
    "egfr_low_severity": "Reduced kidney function increases medication and fluid-management risk.",
    "hemoglobin": "Low hemoglobin increases post-discharge vulnerability.",
    "anemia_severity": "Anemia can worsen recovery after discharge.",
    "hba1c": "Poor glycemic control raises complication risk.",
    "hba1c_risk": "Poor glycemic control raises complication risk.",
    "bp_systolic": "Blood pressure affects short-term risk.",
    "bp_diastolic": "Blood pressure affects short-term risk.",
    "high_bp_flag": "Markedly elevated blood pressure adds near-term instability.",
    "high_risk_medication_count": "Polypharmacy increases adverse-event risk.",
    "high_risk_medication_scaled": "Polypharmacy increases adverse-event risk.",
    "icu_stay_days": "Recent ICU exposure signals higher acuity.",
    "icu_stay_scaled": "Recent ICU exposure signals higher acuity.",
    "phone_access": "Lack of phone access reduces follow-up reliability.",
    "no_phone_access_flag": "No phone access weakens post-discharge follow-up.",
    "transportation_difficulty": "Transport barriers reduce ability to attend follow-up.",
    "transportation_difficulty_flag": "Transport barriers reduce ability to attend follow-up.",
    "lives_alone": "Living alone may reduce post-discharge support.",
    "lives_alone_flag": "Living alone may reduce post-discharge support.",
    "has_heart_failure": "Heart failure is a strong readmission driver.",
    "heart_failure_flag": "Heart failure is a strong readmission driver.",
    "has_diabetes": "Diabetes raises chronic care complexity.",
    "diabetes_flag": "Diabetes raises chronic care complexity.",
    "has_ckd": "CKD adds renal and medication-management risk.",
    "ckd_flag": "CKD adds renal and medication-management risk.",
    "has_malaria": "Malaria episodes can destabilize recently discharged patients.",
    "malaria_flag": "Malaria episodes can destabilize recently discharged patients.",
    "has_hiv": "HIV can increase vulnerability without coordinated follow-up.",
    "hiv_flag": "HIV can increase vulnerability without coordinated follow-up.",
    "on_art": "Active ART is an important treatment context for HIV care.",
    "art_gap_flag": "HIV without ART coverage suggests treatment and follow-up gaps.",
    "has_tuberculosis": "Tuberculosis can prolong recovery and increase care complexity.",
    "tb_flag": "Tuberculosis can prolong recovery and increase care complexity.",
    "has_severe_acute_malnutrition": "Severe malnutrition increases fragility after discharge.",
    "sam_flag": "Severe malnutrition increases fragility after discharge.",
    "has_sickle_cell_disease": "Sickle cell disease raises recurrent acute-care risk.",
    "sickle_cell_flag": "Sickle cell disease raises recurrent acute-care risk.",
    "neonatal_risk": "Neonatal cases require closer post-discharge surveillance.",
    "neonatal_risk_flag": "Neonatal cases require closer post-discharge surveillance.",
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


def to_bool(value: Any, default: bool | None = False) -> bool | None:
    if isinstance(value, bool):
        return value
    if value is None or value == "":
        return default
    normalized = str(value).strip().lower()
    if normalized in {"true", "1", "yes", "y", "on_art", "on-art", "active", "current", "treated"}:
        return True
    if normalized in {"false", "0", "no", "n", "off_art", "off-art", "none", "stopped", "inactive"}:
        return False
    return default


def normalize_string(value: Any) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def get_first_present(payload: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = payload.get(key)
        if value is not None and value != "":
            return value
    return None


def normalize_string_list(value: Any) -> list[str]:
    if value is None or value == "":
        return []

    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("[") and stripped.endswith("]"):
            try:
                return normalize_string_list(json.loads(stripped))
            except json.JSONDecodeError:
                pass
        items = [item for chunk in stripped.split("|") for item in chunk.split(",")]
    elif isinstance(value, list):
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


def normalize_medication_entries(value: Any) -> list[str]:
    if value is None or value == "":
        return []

    if isinstance(value, list):
        items = value
    else:
        try:
            stripped = str(value).strip()
            items = json.loads(stripped) if stripped.startswith("[") else normalize_string_list(stripped)
        except json.JSONDecodeError:
            items = normalize_string_list(value)

    normalized: list[str] = []
    for item in items:
        if isinstance(item, dict):
            text = item.get("name") or item.get("label") or item.get("code")
        else:
            text = item
        if text is None:
            continue
        stripped = normalize_string(text)
        if stripped:
            normalized.append(stripped)

    return normalized


def has_diagnosis_prefix(diagnoses: list[str], prefixes: tuple[str, ...] | list[str]) -> bool:
    return any(
        diagnosis.upper().startswith(prefix)
        for diagnosis in diagnoses
        for prefix in prefixes
    )


def has_medication_pattern(medications: list[str], patterns: tuple[str, ...] | list[str]) -> bool:
    return any(
        pattern in medication.lower()
        for medication in medications
        for pattern in patterns
    )


def resolve_condition_flag(
    features: dict[str, Any],
    explicit_keys: tuple[str, ...] | list[str],
    fallback: bool,
) -> bool:
    explicit = to_bool(get_first_present(features, *explicit_keys), None)
    return explicit if explicit is not None else bool(fallback)


def build_tanzania_priority_conditions(normalized: dict[str, Any]) -> list[str]:
    conditions: list[str] = []
    if normalized["hasMalaria"]:
        conditions.append("malaria")
    if normalized["hasHiv"]:
        conditions.append("hiv")
    if normalized["onArt"]:
        conditions.append("on_art")
    if normalized["hasTuberculosis"]:
        conditions.append("tuberculosis")
    if normalized["hasSevereAcuteMalnutrition"]:
        conditions.append("severe_acute_malnutrition")
    if normalized["hasSickleCellDisease"]:
        conditions.append("sickle_cell_disease")
    if normalized["neonatalRisk"]:
        conditions.append("neonatal_risk")
    return conditions


def build_neonatal_risk_context(
    features: dict[str, Any],
    diagnoses: list[str],
    age_years: float,
) -> dict[str, Any]:
    age_in_days = to_float(
        get_first_present(features, "ageInDays", "age_in_days", "neonatalAgeDays", "neonatal_age_days")
    )
    gestational_age_weeks = to_float(
        get_first_present(features, "gestationalAgeWeeks", "gestational_age_weeks")
    )
    birth_weight_grams = to_float(
        get_first_present(features, "birthWeightGrams", "birth_weight_grams")
    )
    ward = normalize_string(get_first_present(features, "ward"))
    explicit_flag = to_bool(
        get_first_present(features, "neonatalRisk", "neonatal_risk", "isNeonate", "is_neonate"),
        None,
    )

    neonatal_risk_factors: list[str] = []
    if explicit_flag is True:
        neonatal_risk_factors.append("explicit_neonatal_flag")
    if age_in_days is not None and age_in_days <= 28:
        neonatal_risk_factors.append("age_under_28_days")
    elif age_years == 0:
        neonatal_risk_factors.append("age_recorded_as_zero_years")
    if has_diagnosis_prefix(diagnoses, TANZANIA_PRIORITY_PREFIXES["neonatal"]):
        neonatal_risk_factors.append("neonatal_diagnosis")
    if ward and any(pattern in ward.lower() for pattern in NEONATAL_WARD_PATTERNS):
        neonatal_risk_factors.append("neonatal_ward")
    if birth_weight_grams is not None and birth_weight_grams < 2500:
        neonatal_risk_factors.append("low_birth_weight")
    if gestational_age_weeks is not None and gestational_age_weeks < 37:
        neonatal_risk_factors.append("prematurity")

    return {
        "neonatalRisk": explicit_flag is True or len(set(neonatal_risk_factors)) > 0,
        "neonatalRiskFactors": list(dict.fromkeys(neonatal_risk_factors)),
        "ageInDays": age_in_days,
        "gestationalAgeWeeks": gestational_age_weeks,
        "birthWeightGrams": birth_weight_grams,
    }


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
    medications = normalize_medication_entries(get_first_present(features, "medications"))
    age_years = clamp(to_float(get_first_present(features, "age")) or 0.0, 0.0, 95.0)
    art_medication_detected = has_medication_pattern(medications, ART_MEDICATION_PATTERNS)
    neonatal_context = build_neonatal_risk_context(features, diagnoses, age_years)
    has_hiv = resolve_condition_flag(
        features,
        ("hasHiv", "has_hiv", "hivPositive", "hiv_positive"),
        has_diagnosis_prefix(diagnoses, TANZANIA_PRIORITY_PREFIXES["hiv"]),
    )

    return {
        "hasHeartFailure": resolve_condition_flag(
            features,
            ("hasHeartFailure", "has_heart_failure"),
            has_diagnosis_prefix(diagnoses, ("I50",)),
        ),
        "hasDiabetes": resolve_condition_flag(
            features,
            ("hasDiabetes", "has_diabetes"),
            has_diagnosis_prefix(diagnoses, ("E10", "E11", "E13", "O24")),
        ),
        "hasCkd": resolve_condition_flag(
            features,
            ("hasCkd", "has_ckd"),
            has_diagnosis_prefix(diagnoses, ("N18",)),
        ),
        "hasMalaria": resolve_condition_flag(
            features,
            ("hasMalaria", "has_malaria"),
            has_diagnosis_prefix(diagnoses, TANZANIA_PRIORITY_PREFIXES["malaria"]),
        ),
        "hasHiv": has_hiv,
        "onArt": resolve_condition_flag(
            features,
            ("onArt", "on_art", "artStatus", "art_status"),
            has_hiv and art_medication_detected,
        ),
        "hasTuberculosis": resolve_condition_flag(
            features,
            ("hasTuberculosis", "has_tuberculosis", "hasTb", "has_tb"),
            has_diagnosis_prefix(diagnoses, TANZANIA_PRIORITY_PREFIXES["tuberculosis"]),
        ),
        "hasSevereAcuteMalnutrition": resolve_condition_flag(
            features,
            (
                "hasSevereAcuteMalnutrition",
                "has_severe_acute_malnutrition",
                "hasSam",
                "has_sam",
            ),
            has_diagnosis_prefix(diagnoses, TANZANIA_PRIORITY_PREFIXES["severe_acute_malnutrition"]),
        ),
        "hasSickleCellDisease": resolve_condition_flag(
            features,
            ("hasSickleCellDisease", "has_sickle_cell_disease", "hasSickleCell", "has_sickle_cell"),
            has_diagnosis_prefix(diagnoses, TANZANIA_PRIORITY_PREFIXES["sickle_cell_disease"]),
        ),
        "neonatalRisk": neonatal_context["neonatalRisk"],
        "neonatalRiskFactors": neonatal_context["neonatalRiskFactors"],
        "ageInDays": neonatal_context["ageInDays"],
        "gestationalAgeWeeks": neonatal_context["gestationalAgeWeeks"],
        "birthWeightGrams": neonatal_context["birthWeightGrams"],
        "artMedicationDetected": art_medication_detected,
    }


def normalize_features(raw_features: dict[str, Any]) -> dict[str, Any]:
    diagnoses = normalize_string_list(
        raw_features.get("diagnoses") or raw_features.get("diagnosis")
    )
    medications = normalize_medication_entries(get_first_present(raw_features, "medications"))
    condition_flags = derive_condition_flags(raw_features, diagnoses)
    medication_count = to_float(get_first_present(raw_features, "medicationCount", "medication_count"))
    high_risk_medication_count = to_float(
        get_first_present(raw_features, "highRiskMedicationCount", "high_risk_medication_count")
    )

    if medication_count is None:
        medication_count = float(len(medications))

    if high_risk_medication_count is None:
        high_risk_medication_count = float(
            sum(
                1
                for medication in medications
                if any(pattern in medication.lower() for pattern in ("warfarin", "enoxaparin", "heparin", "insulin", "digoxin", "morphine", "tramadol", "prednisone", "furosemide", "spironolactone"))
            )
        )

    return {
        "age": clamp(to_float(get_first_present(raw_features, "age")) or 0.0, 0.0, 95.0),
        "gender": str(get_first_present(raw_features, "gender") or "unknown").lower(),
        "diagnosis": str(get_first_present(raw_features, "diagnosis") or (diagnoses[0] if diagnoses else "unknown")),
        "diagnoses": diagnoses,
        "medications": medications,
        "ward": normalize_string(get_first_present(raw_features, "ward")),
        "priorAdmissions6mo": clamp(
            to_float(get_first_present(raw_features, "priorAdmissions6mo", "prior_admissions_6mo")) or 0.0,
            0.0,
            10.0,
        ),
        "priorAdmissions12m": clamp(
            to_float(get_first_present(raw_features, "priorAdmissions12m", "prior_admissions_12m")) or 0.0,
            0.0,
            12.0,
        ),
        "lengthOfStayDays": clamp(
            to_float(get_first_present(raw_features, "lengthOfStayDays", "length_of_stay_days", "lengthOfStay")) or 0.0,
            0.0,
            30.0,
        ),
        "charlsonIndex": clamp(
            to_float(get_first_present(raw_features, "charlsonIndex", "charlson_index")) or 0.0,
            0.0,
            12.0,
        ),
        "egfr": to_float(get_first_present(raw_features, "egfr")),
        "hemoglobin": to_float(get_first_present(raw_features, "hemoglobin")),
        "hba1c": to_float(get_first_present(raw_features, "hba1c")),
        "bpSystolic": to_float(get_first_present(raw_features, "bpSystolic", "bp_systolic")),
        "bpDiastolic": to_float(get_first_present(raw_features, "bpDiastolic", "bp_diastolic")),
        "medicationCount": clamp(medication_count or 0.0, 0.0, 20.0),
        "highRiskMedicationCount": clamp(high_risk_medication_count or 0.0, 0.0, 8.0),
        "icuStayDays": clamp(
            to_float(get_first_present(raw_features, "icuStayDays", "icu_stay_days")) or 0.0,
            0.0,
            10.0,
        ),
        "phoneAccess": bool(to_bool(get_first_present(raw_features, "phoneAccess", "phone_access"), False)),
        "transportationDifficulty": bool(to_bool(
            get_first_present(raw_features, "transportationDifficulty", "transportation_difficulty"),
            False,
        )),
        "livesAlone": bool(to_bool(get_first_present(raw_features, "livesAlone", "lives_alone"), False)),
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
        "has_malaria": int(normalized["hasMalaria"]),
        "has_hiv": int(normalized["hasHiv"]),
        "on_art": int(normalized["onArt"]),
        "has_tuberculosis": int(normalized["hasTuberculosis"]),
        "has_severe_acute_malnutrition": int(normalized["hasSevereAcuteMalnutrition"]),
        "has_sickle_cell_disease": int(normalized["hasSickleCellDisease"]),
        "neonatal_risk": int(normalized["neonatalRisk"]),
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
        "malaria_flag": 1.0 if normalized["hasMalaria"] else 0.0,
        "hiv_flag": 1.0 if normalized["hasHiv"] else 0.0,
        "art_gap_flag": 1.0 if normalized["hasHiv"] and not normalized["onArt"] else 0.0,
        "tb_flag": 1.0 if normalized["hasTuberculosis"] else 0.0,
        "sam_flag": 1.0 if normalized["hasSevereAcuteMalnutrition"] else 0.0,
        "sickle_cell_flag": 1.0 if normalized["hasSickleCellDisease"] else 0.0,
        "neonatal_risk_flag": 1.0 if normalized["neonatalRisk"] else 0.0,
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
        "tanzaniaPriorityConditions": build_tanzania_priority_conditions(normalized),
        "neonatalRiskFactors": normalized.get("neonatalRiskFactors", []),
        "treatmentSignals": ["on_art"] if normalized["onArt"] else [],
    }

    return engineered, derived


def engineer_features(normalized: dict[str, Any]) -> tuple[dict[str, float], dict[str, Any]]:
    return extract_surrogate_features(normalized)


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
        self.metadata = deepcopy(DEFAULT_ARTIFACT)
        self.is_fallback = True

        if model_dir.is_file() and model_dir.suffix.lower() == ".json":
            try:
                with open(model_dir, "r", encoding="utf-8") as handle:
                    file_metadata = json.load(handle)
                self.metadata.update({key: value for key, value in file_metadata.items() if key != "feature_weights"})
                self.metadata["feature_weights"] = {
                    **DEFAULT_ARTIFACT["feature_weights"],
                    **file_metadata.get("feature_weights", {}),
                }
                self.metadata["artifact_source"] = "file"
            except Exception as e:
                logger.error(f"Failed to load fallback artifact from {model_dir}: {e}")

        if HAS_JOBLIB and model_dir.exists() and model_dir.is_dir():
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
                        file_metadata = json.load(f)
                    self.metadata.update({key: value for key, value in file_metadata.items() if key != "feature_weights"})
                    if "feature_weights" in file_metadata:
                        self.metadata["feature_weights"] = {
                            **self.metadata.get("feature_weights", {}),
                            **file_metadata["feature_weights"],
                        }
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
            "tanzaniaPriorityConditions": derived.get("tanzaniaPriorityConditions", []),
            "neonatalRiskFactors": derived.get("neonatalRiskFactors", []),
            "treatmentSignals": derived.get("treatmentSignals", []),
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
            "tanzaniaPriorityConditions": derived.get("tanzaniaPriorityConditions", []),
            "neonatalRiskFactors": derived.get("neonatalRiskFactors", []),
            "treatmentSignals": derived.get("treatmentSignals", []),
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
