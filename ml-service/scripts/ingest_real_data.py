#!/usr/bin/env python3
"""
Normalize TRIP backend ML exports into a training-ready dataset for temporal model training.

This script accepts JSON or CSV files exported from:
  /api/analytics/ml/training-dataset

It converts camelCase export rows into the snake_case schema expected by train_model.py,
drops rows that cannot be used for temporal training, and emits a report that highlights
missing labels, missing dates, and diagnosis rows that still need mapping review.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.predictor import (
    extract_ml_features,
    get_first_present,
    normalize_features,
    normalize_string_list,
)

ICD10_PATTERN = re.compile(r"^[A-TV-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?$", re.IGNORECASE)
TRAINING_FIELDS = [
    "facility_id",
    "visit_id",
    "admission_date",
    "discharge_date",
    "event_date",
    "ward",
    "discharge_disposition",
    "primary_diagnosis",
    "diagnoses",
    "diagnosis_count",
    "diagnosis_mapping_status",
    "tanzania_priority_conditions",
    "age",
    "gender",
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
    "days_to_readmission",
    "readmitted_30d",
]


def parse_args() -> argparse.Namespace:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(
        description="Normalize backend ML dataset exports into temporal-training CSV files."
    )
    parser.add_argument(
        "input_path",
        type=Path,
        help="Path to a JSON or CSV export from /api/analytics/ml/training-dataset.",
    )
    parser.add_argument(
        "output_path",
        type=Path,
        nargs="?",
        default=root / "data" / "real" / "trip_training_dataset_normalized.csv",
        help="Where to write the normalized CSV dataset.",
    )
    parser.add_argument(
        "--report-path",
        type=Path,
        default=None,
        help="Optional JSON report path. Defaults to <output>.report.json.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Fail if rows are dropped or diagnosis mapping review is still required.",
    )
    return parser.parse_args()


def load_rows(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    suffix = path.suffix.lower()
    if suffix == ".json":
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        if isinstance(payload, dict):
            rows = payload.get("rows", [])
        elif isinstance(payload, list):
            rows = payload
        else:
            rows = []
        return [dict(row) for row in rows]

    if suffix == ".csv":
        with path.open("r", encoding="utf-8", newline="") as handle:
            return [dict(row) for row in csv.DictReader(handle)]

    raise ValueError("Unsupported dataset format. Use .json or .csv")


def parse_iso_datetime(value: Any) -> str | None:
    if value is None or value == "":
        return None

    text = str(value).strip()
    if not text:
        return None

    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"

    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    else:
        parsed = parsed.astimezone(timezone.utc)

    return parsed.isoformat()


def parse_binary_label(value: Any) -> int | None:
    if value is None or value == "":
        return None

    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes"}:
        return 1
    if normalized in {"0", "false", "no"}:
        return 0

    try:
        numeric = float(normalized)
    except ValueError:
        return None

    if numeric in {0.0, 1.0}:
        return int(numeric)

    return None


def parse_optional_number(value: Any) -> int | float | None:
    if value is None or value == "":
        return None

    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None

    if numeric.is_integer():
        return int(numeric)
    return round(numeric, 4)


def classify_diagnosis_mapping(raw_row: dict[str, Any], normalized: dict[str, Any]) -> tuple[str, list[str]]:
    diagnoses = normalize_string_list(raw_row.get("diagnoses") or raw_row.get("diagnosis"))
    if not diagnoses:
        diagnoses = normalize_string_list(normalized.get("diagnoses"))

    coded = [diagnosis for diagnosis in diagnoses if ICD10_PATTERN.match(diagnosis)]
    if coded:
        return "coded", diagnoses

    explicit_condition_flags = any(
        normalized.get(key)
        for key in (
            "hasHeartFailure",
            "hasDiabetes",
            "hasCkd",
            "hasMalaria",
            "hasHiv",
            "onArt",
            "hasTuberculosis",
            "hasSevereAcuteMalnutrition",
            "hasSickleCellDisease",
            "neonatalRisk",
        )
    )
    if explicit_condition_flags:
        return "explicit_flags_only", diagnoses
    if diagnoses:
        return "free_text", diagnoses
    return "missing", diagnoses


def to_pipe_string(values: list[str]) -> str:
    return "|".join(str(value).strip() for value in values if str(value).strip())


def normalize_row(raw_row: dict[str, Any], row_number: int) -> tuple[dict[str, Any] | None, str | None, dict[str, Any]]:
    normalized = normalize_features(raw_row)
    ml_features = extract_ml_features(normalized)

    admission_date = parse_iso_datetime(
        get_first_present(raw_row, "admissionDate", "admission_date")
    )
    discharge_date = parse_iso_datetime(
        get_first_present(raw_row, "dischargeDate", "discharge_date")
    )
    event_date = discharge_date or admission_date
    if event_date is None:
        return None, "missing_temporal_date", {}

    label = parse_binary_label(
        get_first_present(raw_row, "readmitted30d", "readmitted_30d")
    )
    if label is None:
        return None, "missing_training_label", {}

    diagnosis_mapping_status, diagnoses = classify_diagnosis_mapping(raw_row, normalized)
    priority_conditions = [
        condition
        for condition, enabled in (
            ("malaria", ml_features["has_malaria"]),
            ("hiv", ml_features["has_hiv"]),
            ("on_art", ml_features["on_art"]),
            ("tuberculosis", ml_features["has_tuberculosis"]),
            ("severe_acute_malnutrition", ml_features["has_severe_acute_malnutrition"]),
            ("sickle_cell_disease", ml_features["has_sickle_cell_disease"]),
            ("neonatal_risk", ml_features["neonatal_risk"]),
        )
        if enabled
    ]

    row = {
        "facility_id": get_first_present(raw_row, "facilityId", "facility_id"),
        "visit_id": get_first_present(raw_row, "visitId", "visit_id") or f"row-{row_number}",
        "admission_date": admission_date,
        "discharge_date": discharge_date,
        "event_date": event_date,
        "ward": get_first_present(raw_row, "ward"),
        "discharge_disposition": get_first_present(
            raw_row,
            "dischargeDisposition",
            "discharge_disposition",
        ),
        "primary_diagnosis": normalized.get("diagnosis"),
        "diagnoses": to_pipe_string(diagnoses),
        "diagnosis_count": len(diagnoses),
        "diagnosis_mapping_status": diagnosis_mapping_status,
        "tanzania_priority_conditions": to_pipe_string(priority_conditions),
        **ml_features,
        "days_to_readmission": parse_optional_number(
            get_first_present(raw_row, "daysToReadmission", "days_to_readmission")
        ),
        "readmitted_30d": label,
    }

    review_details = {
        "rowNumber": row_number,
        "visitId": row["visit_id"],
        "facilityId": row["facility_id"],
        "diagnosisMappingStatus": diagnosis_mapping_status,
        "diagnoses": diagnoses[:5],
    }
    return row, None, review_details


def build_report(
    input_path: Path,
    input_count: int,
    normalized_rows: list[dict[str, Any]],
    dropped_reasons: Counter,
    diagnosis_statuses: Counter,
    diagnosis_review_examples: list[dict[str, Any]],
) -> dict[str, Any]:
    positive_count = sum(1 for row in normalized_rows if row["readmitted_30d"] == 1)
    facilities = sorted({row["facility_id"] for row in normalized_rows if row["facility_id"]})
    review_statuses = {"free_text", "missing", "explicit_flags_only"}
    review_rows = sum(count for status, count in diagnosis_statuses.items() if status in review_statuses)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "input_path": str(input_path),
        "input_row_count": input_count,
        "output_row_count": len(normalized_rows),
        "dropped_row_count": sum(dropped_reasons.values()),
        "dropped_reasons": dict(dropped_reasons),
        "positive_count": positive_count,
        "negative_count": len(normalized_rows) - positive_count,
        "positive_rate": round(positive_count / len(normalized_rows), 4) if normalized_rows else 0,
        "facility_count": len(facilities),
        "facilities": facilities,
        "diagnosis_mapping_status_breakdown": dict(diagnosis_statuses),
        "diagnosis_mapping_review_count": review_rows,
        "diagnosis_mapping_review_examples": diagnosis_review_examples[:10],
        "temporal_date_coverage": round(len(normalized_rows) / input_count, 4) if input_count else 0,
    }


def write_rows(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=TRAINING_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def strict_mode_failed(report: dict[str, Any]) -> bool:
    if report["output_row_count"] == 0:
        return True
    if report["dropped_row_count"] > 0:
        return True
    if report["diagnosis_mapping_review_count"] > 0:
        return True
    return False


def main() -> int:
    args = parse_args()
    rows = load_rows(args.input_path)

    normalized_rows: list[dict[str, Any]] = []
    dropped_reasons: Counter[str] = Counter()
    diagnosis_statuses: Counter[str] = Counter()
    diagnosis_review_examples: list[dict[str, Any]] = []

    for index, raw_row in enumerate(rows, start=1):
        normalized_row, drop_reason, review_details = normalize_row(raw_row, index)
        if drop_reason:
            dropped_reasons[drop_reason] += 1
            continue

        assert normalized_row is not None
        normalized_rows.append(normalized_row)
        diagnosis_status = normalized_row["diagnosis_mapping_status"]
        diagnosis_statuses[diagnosis_status] += 1
        if diagnosis_status != "coded":
            diagnosis_review_examples.append(review_details)

    report = build_report(
        args.input_path,
        len(rows),
        normalized_rows,
        dropped_reasons,
        diagnosis_statuses,
        diagnosis_review_examples,
    )

    report_path = args.report_path or args.output_path.with_suffix(".report.json")
    write_rows(args.output_path, normalized_rows)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")

    print("Normalized real-data training dataset")
    print(f"Input rows:  {len(rows)}")
    print(f"Output rows: {len(normalized_rows)}")
    print(f"Dropped:     {report['dropped_row_count']}")
    print(f"Report:      {report_path}")
    print(f"Output CSV:  {args.output_path}")

    if args.strict and strict_mode_failed(report):
        print("Strict validation failed. Review the generated report before training.")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
