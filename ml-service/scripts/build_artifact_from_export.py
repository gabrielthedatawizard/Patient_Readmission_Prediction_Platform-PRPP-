from __future__ import annotations

import argparse
import csv
import json
import math
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.predictor import DEFAULT_ARTIFACT, engineer_features, normalize_features


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a calibrated TRIP model artifact from an exported training dataset."
    )
    parser.add_argument(
        "input_path",
        type=Path,
        help="Path to a JSON or CSV dataset exported from /api/analytics/ml/training-dataset",
    )
    parser.add_argument(
        "output_path",
        type=Path,
        nargs="?",
        default=Path("data/models/trip_clinical_model_calibrated.json"),
        help="Where to write the calibrated model artifact JSON.",
    )
    return parser.parse_args()


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


def load_rows(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    if path.suffix.lower() == ".json":
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        if isinstance(payload, dict):
            rows = payload.get("rows", [])
        elif isinstance(payload, list):
            rows = payload
        else:
            rows = []
        return [dict(row) for row in rows]

    if path.suffix.lower() == ".csv":
        with path.open("r", encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            return [dict(row) for row in reader]

    raise ValueError("Unsupported dataset format. Use .json or .csv")


def mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def load_labelled_engineered_rows(rows: list[dict[str, Any]]) -> list[tuple[dict[str, float], int]]:
    labelled_rows: list[tuple[dict[str, float], int]] = []

    for row in rows:
      label_raw = row.get("readmitted30d")
      label = to_float(label_raw)
      if label not in {0.0, 1.0}:
          continue

      normalized = normalize_features(row)
      engineered, _ = engineer_features(normalized)
      labelled_rows.append((engineered, int(label)))

    return labelled_rows


def build_artifact(labelled_rows: list[tuple[dict[str, float], int]]) -> dict[str, Any]:
    artifact = deepcopy(DEFAULT_ARTIFACT)
    default_weights = artifact["feature_weights"]

    if not labelled_rows:
        artifact["model_version"] = "trip-clinical-logit-v1-empty-calibration"
        artifact["artifact_source"] = "dataset-export-empty"
        artifact["metadata"] = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "row_count": 0,
            "positive_count": 0,
            "negative_count": 0,
        }
        return artifact

    positives = [engineered for engineered, label in labelled_rows if label == 1]
    negatives = [engineered for engineered, label in labelled_rows if label == 0]
    base_rate = len(positives) / len(labelled_rows)
    artifact["intercept"] = round(math.log(clamp(base_rate, 0.01, 0.99) / (1 - clamp(base_rate, 0.01, 0.99))), 3)

    recalibrated_weights: dict[str, float] = {}
    for feature_name, default_weight in default_weights.items():
        positive_mean = mean([row.get(feature_name, 0.0) for row in positives])
        negative_mean = mean([row.get(feature_name, 0.0) for row in negatives])
        difference = positive_mean - negative_mean

        if abs(difference) < 0.01:
            recalibrated_weights[feature_name] = round(float(default_weight), 3)
            continue

        magnitude = clamp(abs(difference) * 1.8, 0.05, 1.25)
        recalibrated_weights[feature_name] = round(magnitude if difference >= 0 else -magnitude, 3)

    artifact["feature_weights"] = recalibrated_weights
    artifact["model_version"] = (
        f"trip-clinical-calibrated-{datetime.now(timezone.utc).strftime('%Y%m%d')}"
    )
    artifact["artifact_source"] = "dataset-export-calibration"
    artifact["metadata"] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "row_count": len(labelled_rows),
        "positive_count": len(positives),
        "negative_count": len(negatives),
        "base_rate": round(base_rate, 4),
    }
    return artifact


def main() -> None:
    args = parse_args()
    rows = load_rows(args.input_path)
    labelled_rows = load_labelled_engineered_rows(rows)
    artifact = build_artifact(labelled_rows)

    args.output_path.parent.mkdir(parents=True, exist_ok=True)
    with args.output_path.open("w", encoding="utf-8") as handle:
        json.dump(artifact, handle, indent=2)
        handle.write("\n")

    print("Built calibrated artifact")
    print(f"Input rows: {len(rows)}")
    print(f"Labelled rows used: {len(labelled_rows)}")
    print(f"Output: {args.output_path}")
    print(f"Model version: {artifact['model_version']}")


if __name__ == "__main__":
    main()
