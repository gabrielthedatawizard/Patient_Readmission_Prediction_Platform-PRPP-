#!/usr/bin/env python3
"""
Run the final TRIP MVP retraining gate on a real or normalized dataset.

This script can accept either:
1. A raw backend export from /api/analytics/ml/training-dataset (JSON or CSV), or
2. A normalized training CSV that already matches the temporal training schema.

Workflow:
1. Normalize the input if needed.
2. Train a temporal model artifact.
3. Evaluate training metadata against configurable clinical readiness thresholds.
4. Write a validation report and exit non-zero if the gate fails.
"""

from __future__ import annotations

import argparse
import csv
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import ingest_real_data
import train_model


REQUIRED_NORMALIZED_COLUMNS = {
    "admission_date",
    "discharge_date",
    "age",
    "gender",
    "prior_admissions_12m",
    "length_of_stay_days",
    "charlson_index",
    "readmitted_30d",
}


def parse_args() -> argparse.Namespace:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(
        description="Retrain the TRIP model and evaluate the final clinical-validation gate."
    )
    parser.add_argument(
        "input_path",
        type=Path,
        help="Raw backend export JSON/CSV or a normalized training CSV.",
    )
    parser.add_argument(
        "--normalized-output",
        type=Path,
        default=root / "data" / "real" / "trip_training_dataset_normalized.csv",
        help="Path for the normalized CSV used by training.",
    )
    parser.add_argument(
        "--model-output-dir",
        type=Path,
        default=root / "data" / "models" / "real_validation_run",
        help="Directory for retrained model artifacts.",
    )
    parser.add_argument(
        "--report-path",
        type=Path,
        default=root / "data" / "models" / "clinical_validation_report.json",
        help="Where to write the clinical validation report.",
    )
    parser.add_argument(
        "--skip-shap",
        action="store_true",
        help="Skip SHAP explainer generation during retraining.",
    )
    parser.add_argument(
        "--allow-ingestion-gaps",
        action="store_true",
        help="Allow dropped rows or diagnosis mapping review to continue into training.",
    )
    parser.add_argument("--min-labelled-rows", type=int, default=200)
    parser.add_argument("--min-validation-roc-auc", type=float, default=0.7)
    parser.add_argument("--min-test-roc-auc", type=float, default=0.7)
    parser.add_argument("--min-test-recall", type=float, default=0.25)
    parser.add_argument("--max-test-brier-score", type=float, default=0.2)
    parser.add_argument("--max-dropped-row-rate", type=float, default=0.05)
    parser.add_argument("--max-diagnosis-review-rate", type=float, default=0.1)
    return parser.parse_args()


def read_csv_header(path: Path) -> list[str]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        return next(reader, [])


def count_csv_rows(path: Path) -> int:
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        next(reader, None)
        return sum(1 for _ in reader)


def is_normalized_training_csv(path: Path) -> bool:
    if path.suffix.lower() != ".csv" or not path.exists():
        return False

    header = set(read_csv_header(path))
    return REQUIRED_NORMALIZED_COLUMNS.issubset(header)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def build_normalized_input_report(input_path: Path, output_path: Path) -> dict[str, Any]:
    row_count = count_csv_rows(output_path)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "input_path": str(input_path),
        "input_mode": "normalized_training_csv",
        "input_row_count": row_count,
        "output_row_count": row_count,
        "dropped_row_count": 0,
        "dropped_reasons": {},
        "positive_count": None,
        "negative_count": None,
        "positive_rate": None,
        "facility_count": None,
        "facilities": [],
        "diagnosis_mapping_status_breakdown": {},
        "diagnosis_mapping_review_count": 0,
        "diagnosis_mapping_review_examples": [],
        "temporal_date_coverage": 1.0,
    }


def normalize_input_dataset(
    input_path: Path,
    output_path: Path,
    allow_ingestion_gaps: bool,
) -> tuple[Path, dict[str, Any]]:
    if is_normalized_training_csv(input_path):
        output_path.parent.mkdir(parents=True, exist_ok=True)
        if input_path.resolve() != output_path.resolve():
            shutil.copyfile(input_path, output_path)
        report = build_normalized_input_report(input_path, output_path)
        return output_path, report

    rows = ingest_real_data.load_rows(input_path)
    normalized_rows: list[dict[str, Any]] = []
    dropped_reasons = ingest_real_data.Counter()
    diagnosis_statuses = ingest_real_data.Counter()
    diagnosis_review_examples: list[dict[str, Any]] = []

    for index, raw_row in enumerate(rows, start=1):
        normalized_row, drop_reason, review_details = ingest_real_data.normalize_row(raw_row, index)
        if drop_reason:
            dropped_reasons[drop_reason] += 1
            continue

        assert normalized_row is not None
        normalized_rows.append(normalized_row)
        diagnosis_status = normalized_row["diagnosis_mapping_status"]
        diagnosis_statuses[diagnosis_status] += 1
        if diagnosis_status != "coded":
            diagnosis_review_examples.append(review_details)

    report = ingest_real_data.build_report(
        input_path,
        len(rows),
        normalized_rows,
        dropped_reasons,
        diagnosis_statuses,
        diagnosis_review_examples,
    )
    report["input_mode"] = "raw_backend_export"

    ingest_real_data.write_rows(output_path, normalized_rows)
    if not allow_ingestion_gaps and ingest_real_data.strict_mode_failed(report):
        return output_path, report

    return output_path, report


def safe_value(value: Any, fallback: float | int | None = None) -> float | int | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return value
    return fallback


def safe_rate(numerator: float, denominator: float) -> float:
    if not denominator:
        return 0.0
    return numerator / denominator


def metric_value(metadata: dict[str, Any], section: str, metric: str) -> float | None:
    value = metadata.get(section, {}).get(metric)
    return value if isinstance(value, (int, float)) else None


def evaluate_gate(
    metadata: dict[str, Any],
    ingestion_report: dict[str, Any],
    thresholds: dict[str, float | int],
) -> dict[str, Any]:
    input_row_count = safe_value(ingestion_report.get("input_row_count"), 0) or 0
    output_row_count = safe_value(ingestion_report.get("output_row_count"), 0) or 0
    dropped_row_count = safe_value(ingestion_report.get("dropped_row_count"), 0) or 0
    diagnosis_review_count = safe_value(ingestion_report.get("diagnosis_mapping_review_count"), 0) or 0
    dropped_row_rate = safe_rate(dropped_row_count, input_row_count)
    diagnosis_review_rate = safe_rate(diagnosis_review_count, output_row_count)

    checks = [
        {
            "metric": "labelled_rows",
            "operator": ">=",
            "threshold": thresholds["min_labelled_rows"],
            "value": safe_value(metadata.get("dataset_rows"), 0) or 0,
        },
        {
            "metric": "validation_roc_auc",
            "operator": ">=",
            "threshold": thresholds["min_validation_roc_auc"],
            "value": metric_value(metadata, "validation_metrics", "roc_auc"),
        },
        {
            "metric": "test_roc_auc",
            "operator": ">=",
            "threshold": thresholds["min_test_roc_auc"],
            "value": metric_value(metadata, "test_metrics", "roc_auc"),
        },
        {
            "metric": "test_recall",
            "operator": ">=",
            "threshold": thresholds["min_test_recall"],
            "value": metric_value(metadata, "test_metrics", "recall"),
        },
        {
            "metric": "test_brier_score",
            "operator": "<=",
            "threshold": thresholds["max_test_brier_score"],
            "value": metric_value(metadata, "test_metrics", "brier_score"),
        },
        {
            "metric": "dropped_row_rate",
            "operator": "<=",
            "threshold": thresholds["max_dropped_row_rate"],
            "value": round(dropped_row_rate, 4),
        },
        {
            "metric": "diagnosis_review_rate",
            "operator": "<=",
            "threshold": thresholds["max_diagnosis_review_rate"],
            "value": round(diagnosis_review_rate, 4),
        },
    ]

    for check in checks:
        if check["value"] is None:
            check["passed"] = False
            continue
        if check["operator"] == ">=":
            check["passed"] = bool(check["value"] >= check["threshold"])
        else:
            check["passed"] = bool(check["value"] <= check["threshold"])

    failed_metrics = [check["metric"] for check in checks if not check["passed"]]
    ready_for_clinical_review = not failed_metrics

    next_actions: list[str] = []
    if "dropped_row_rate" in failed_metrics:
        next_actions.append("Resolve missing temporal dates or labels in the source export before retraining.")
    if "diagnosis_review_rate" in failed_metrics:
        next_actions.append("Review diagnosis mapping for free-text or explicit-flag-only rows before clinical sign-off.")
    if {"validation_roc_auc", "test_roc_auc", "test_recall", "test_brier_score"} & set(failed_metrics):
        next_actions.append("Improve model performance or increase pilot data coverage before clinical rollout.")
    if "labelled_rows" in failed_metrics:
        next_actions.append("Collect more de-identified labelled discharge encounters before final validation.")
    if ready_for_clinical_review:
        next_actions.append("Run clinical governance review and document pilot sign-off before production rollout.")

    return {
        "ready_for_clinical_review": ready_for_clinical_review,
        "failed_metrics": failed_metrics,
        "checks": checks,
        "next_actions": next_actions,
        "clinical_signoff": {
            "required": True,
            "status": "pending_review" if ready_for_clinical_review else "blocked",
            "checklist": [
                "Clinical lead reviews temporal holdout metrics.",
                "Calibration and safety thresholds are accepted for pilot scope.",
                "Pilot validation sign-off is recorded before clinical rollout.",
            ],
        },
    }


def load_training_metadata(model_output_dir: Path) -> dict[str, Any]:
    metadata_path = model_output_dir / "model_metadata.json"
    with metadata_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def build_report(
    *,
    input_path: Path,
    normalized_dataset_path: Path,
    model_output_dir: Path,
    ingestion_report: dict[str, Any],
    metadata: dict[str, Any],
    gate: dict[str, Any],
) -> dict[str, Any]:
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "input_path": str(input_path),
        "normalized_dataset_path": str(normalized_dataset_path),
        "model_output_dir": str(model_output_dir),
        "ingestion": {
            "mode": ingestion_report.get("input_mode"),
            "input_row_count": ingestion_report.get("input_row_count"),
            "output_row_count": ingestion_report.get("output_row_count"),
            "dropped_row_count": ingestion_report.get("dropped_row_count"),
            "dropped_reasons": ingestion_report.get("dropped_reasons"),
            "diagnosis_mapping_review_count": ingestion_report.get("diagnosis_mapping_review_count"),
            "diagnosis_mapping_status_breakdown": ingestion_report.get("diagnosis_mapping_status_breakdown"),
        },
        "training": {
            "model_version": metadata.get("model_version"),
            "model_type": metadata.get("model_type"),
            "dataset_rows": metadata.get("dataset_rows"),
            "readmission_rate": metadata.get("readmission_rate"),
            "train_metrics": metadata.get("train_metrics"),
            "validation_metrics": metadata.get("validation_metrics"),
            "test_metrics": metadata.get("test_metrics"),
            "calibration": metadata.get("calibration"),
            "temporal_split": metadata.get("temporal_split"),
        },
        "gate": gate,
    }


def main() -> int:
    args = parse_args()
    normalized_output = args.normalized_output
    model_output_dir = args.model_output_dir
    report_path = args.report_path

    normalized_dataset_path, ingestion_report = normalize_input_dataset(
        args.input_path,
        normalized_output,
        allow_ingestion_gaps=args.allow_ingestion_gaps,
    )

    strict_ingestion_failed = (
        not args.allow_ingestion_gaps and ingest_real_data.strict_mode_failed(ingestion_report)
    )
    if strict_ingestion_failed:
        report = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "input_path": str(args.input_path),
            "normalized_dataset_path": str(normalized_dataset_path),
            "model_output_dir": str(model_output_dir),
            "ingestion": ingestion_report,
            "gate": {
                "ready_for_clinical_review": False,
                "failed_metrics": ["ingestion_strict_mode"],
                "checks": [],
                "next_actions": [
                    "Resolve dropped rows and diagnosis mapping review findings before retraining."
                ],
                "clinical_signoff": {
                    "required": True,
                    "status": "blocked",
                    "checklist": [],
                },
            },
        }
        write_json(report_path, report)
        print("Clinical validation gate blocked before training.")
        print(f"Report: {report_path}")
        return 1

    train_model.train_and_save(
        normalized_dataset_path,
        model_output_dir,
        use_shap=not args.skip_shap,
    )
    metadata = load_training_metadata(model_output_dir)
    thresholds = {
        "min_labelled_rows": args.min_labelled_rows,
        "min_validation_roc_auc": args.min_validation_roc_auc,
        "min_test_roc_auc": args.min_test_roc_auc,
        "min_test_recall": args.min_test_recall,
        "max_test_brier_score": args.max_test_brier_score,
        "max_dropped_row_rate": args.max_dropped_row_rate,
        "max_diagnosis_review_rate": args.max_diagnosis_review_rate,
    }
    gate = evaluate_gate(metadata, ingestion_report, thresholds)
    report = build_report(
        input_path=args.input_path,
        normalized_dataset_path=normalized_dataset_path,
        model_output_dir=model_output_dir,
        ingestion_report=ingestion_report,
        metadata=metadata,
        gate=gate,
    )
    write_json(report_path, report)

    print("Clinical validation report written")
    print(f"Ready for clinical review: {gate['ready_for_clinical_review']}")
    print(f"Report: {report_path}")

    return 0 if gate["ready_for_clinical_review"] else 1


if __name__ == "__main__":
    sys.exit(main())
