#!/usr/bin/env python3
"""
Model drift monitor for TRIP readmission predictions.

Compares AUC on the most recent 30-day labelled window against the
training baseline. Writes a drift alert to stdout (and optionally a
JSON log file) if AUC drops by more than DRIFT_THRESHOLD_PCT.

Usage:
  python monitor_model_drift.py \
      --db-url postgresql://user:pass@host/db \
      --baseline-auc 0.78 \
      [--window-days 30] \
      [--drift-threshold 0.05] \
      [--output drift_alerts.jsonl]
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from datetime import datetime, timedelta, timezone


def _try_import(name: str):
    try:
        return __import__(name)
    except ModuleNotFoundError:
        return None


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def compute_auc(y_true: list[int], y_score: list[float]) -> float:
    """Compute ROC-AUC using the trapezoidal rule (no sklearn needed)."""
    pairs = sorted(zip(y_score, y_true), reverse=True)
    n_pos = sum(y_true)
    n_neg = len(y_true) - n_pos

    if n_pos == 0 or n_neg == 0:
        return float("nan")

    tp = fp = 0
    prev_fp = prev_tp = 0
    auc = 0.0
    prev_score = None

    for score, label in pairs:
        if score != prev_score:
            auc += (fp - prev_fp) * (tp + prev_tp) / 2
            prev_fp, prev_tp = fp, tp
            prev_score = score
        if label == 1:
            tp += 1
        else:
            fp += 1

    auc += (fp - prev_fp) * (tp + prev_tp) / 2
    return auc / (n_pos * n_neg)


def fetch_labelled_predictions(db_url: str, window_days: int) -> list[dict]:
    """
    Pull predictions that have been retrospectively labelled by a
    ReadmissionEvent within the look-back window.

    Returns a list of {"probability": float, "readmitted": int} dicts.
    """
    psycopg2 = _try_import("psycopg2")
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is not installed. Run: pip install psycopg2-binary")

    cutoff = datetime.now(timezone.utc) - timedelta(days=window_days)

    query = """
        SELECT
            p.probability,
            CASE WHEN re.id IS NOT NULL THEN 1 ELSE 0 END AS readmitted
        FROM "Prediction" p
        LEFT JOIN "ReadmissionEvent" re
            ON re."patientId" = p."patientId"
            AND re."detectedAt" >= p."generatedAt"
            AND re."detectedAt" < p."generatedAt" + INTERVAL '30 days'
        WHERE p."generatedAt" >= %s
          AND p.probability IS NOT NULL
    """

    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute(query, (cutoff,))
            return [
                {"probability": float(row[0]), "readmitted": int(row[1])}
                for row in cur.fetchall()
            ]
    finally:
        conn.close()


def build_drift_alert(
    window_auc: float,
    baseline_auc: float,
    drift_threshold: float,
    n_samples: int,
    window_days: int,
) -> dict:
    drift = baseline_auc - window_auc
    drifted = drift > drift_threshold and not math.isnan(window_auc)

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "windowDays": window_days,
        "nSamples": n_samples,
        "baselineAuc": round(baseline_auc, 4),
        "windowAuc": round(window_auc, 4) if not math.isnan(window_auc) else None,
        "aucDrop": round(drift, 4) if not math.isnan(drift) else None,
        "driftThreshold": drift_threshold,
        "driftDetected": drifted,
        "severity": "critical" if drifted and drift > drift_threshold * 2 else ("warning" if drifted else "ok"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="TRIP model AUC drift monitor")
    parser.add_argument("--db-url", default=os.environ.get("DATABASE_URL"), help="PostgreSQL connection URL")
    parser.add_argument("--baseline-auc", type=float, default=float(os.environ.get("TRIP_BASELINE_AUC", "0.78")))
    parser.add_argument("--window-days", type=int, default=30)
    parser.add_argument("--drift-threshold", type=float, default=0.05, help="Alert if AUC drops by this amount")
    parser.add_argument("--output", default=None, help="Append drift alert JSON to this file (JSONL format)")
    args = parser.parse_args()

    if not args.db_url:
        print("ERROR: --db-url or DATABASE_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)

    try:
        rows = fetch_labelled_predictions(args.db_url, args.window_days)
    except Exception as exc:
        print(f"ERROR fetching predictions: {exc}", file=sys.stderr)
        sys.exit(1)

    if len(rows) < 20:
        print(
            f"WARNING: Only {len(rows)} labelled predictions in the last {args.window_days} days. "
            "Insufficient data for reliable AUC estimate.",
            file=sys.stderr,
        )

    y_true = [row["readmitted"] for row in rows]
    y_score = [row["probability"] for row in rows]
    window_auc = compute_auc(y_true, y_score) if rows else float("nan")

    alert = build_drift_alert(
        window_auc=window_auc,
        baseline_auc=args.baseline_auc,
        drift_threshold=args.drift_threshold,
        n_samples=len(rows),
        window_days=args.window_days,
    )

    print(json.dumps(alert, indent=2))

    if args.output:
        with open(args.output, "a", encoding="utf-8") as f:
            f.write(json.dumps(alert) + "\n")

    if alert["driftDetected"]:
        print(
            f"\nDRIFT ALERT: AUC dropped {alert['aucDrop']:.4f} "
            f"(baseline={alert['baselineAuc']}, window={alert['windowAuc']}, "
            f"threshold={alert['driftThreshold']}). Severity: {alert['severity'].upper()}",
            file=sys.stderr,
        )
        sys.exit(2)


if __name__ == "__main__":
    main()
