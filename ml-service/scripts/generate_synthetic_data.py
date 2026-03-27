#!/usr/bin/env python3
"""
Generate a synthetic clinical dataset for training a patient readmission model.

Produces a CSV with realistic clinical features and a binary 30-day readmission
target label correlated to known clinical risk factors.
"""

from __future__ import annotations

import argparse
import math
import random
from datetime import date, timedelta
from pathlib import Path

FEATURE_COLUMNS = [
    "patient_id",
    "admission_date",
    "discharge_date",
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
    "readmitted_30d",
]

ICD_CODES_HF = ["I50.9", "I50.1", "I50.22", "I50.32", "I50.42"]
ICD_CODES_DM = ["E11.9", "E11.65", "E11.69", "E13.9"]
ICD_CODES_CKD = ["N18.3", "N18.4", "N18.5", "N18.9"]
ICD_CODES_OTHER = [
    "J44.1", "J18.9", "I10", "I25.10", "J06.9", "K21.0",
    "M54.5", "G47.33", "F32.9", "E78.5", "Z96.1",
]


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def generate_row(patient_index: int, rng: random.Random) -> dict:
    neonatal_case = rng.random() < 0.05
    if neonatal_case:
        age = 0
        gender = rng.choice(["male", "female"])
    else:
        age = max(18, min(100, int(rng.gauss(62, 16))))
        gender = rng.choices(["male", "female"], weights=[0.52, 0.48])[0]

    has_hf = False if neonatal_case else rng.random() < (0.25 if age > 65 else 0.08)
    has_dm = False if neonatal_case else rng.random() < (0.30 if age > 55 else 0.10)
    has_ckd = False if neonatal_case else rng.random() < (0.18 if age > 60 else 0.05)
    has_malaria = rng.random() < (0.16 if neonatal_case else 0.08)
    has_hiv = False if neonatal_case else rng.random() < (0.12 if 18 <= age <= 49 else 0.06)
    on_art = has_hiv and rng.random() < 0.82
    has_tb = rng.random() < (0.18 if has_hiv else 0.03)
    has_sam = rng.random() < (0.22 if neonatal_case else 0.03)
    has_sickle = rng.random() < (0.04 if neonatal_case else 0.025)
    neonatal_risk = neonatal_case

    charlson = 0
    if has_hf:
        charlson += rng.randint(1, 3)
    if has_dm:
        charlson += rng.randint(1, 2)
    if has_ckd:
        charlson += rng.randint(1, 3)
    if has_tb:
        charlson += 1
    if has_hiv and not on_art:
        charlson += 1
    if age > 70:
        charlson += rng.randint(0, 2)
    charlson = min(charlson, 12)

    prior_admissions = max(0, int(rng.expovariate(0.6)))
    if has_hf:
        prior_admissions += rng.randint(0, 2)
    prior_admissions = min(prior_admissions, 10)

    los = max(1, int(rng.gauss((7 if neonatal_case else 5) + charlson * 0.8, 3)))
    los = min(los, 45)

    egfr = max(10, min(120, int(rng.gauss(75 if not has_ckd else 42, 18))))
    hemoglobin = round(
        max(
            5.0,
            min(
                18.0,
                rng.gauss(
                    11.6 if (has_tb or has_hiv or has_sam or has_sickle) else (12.5 if not has_ckd else 10.2),
                    1.8,
                ),
            ),
        ),
        1,
    )
    hba1c = round(max(4.0, min(14.0, rng.gauss(5.8 if not has_dm else 8.5, 1.2))), 1)
    bp_sys = max(80, min(220, int(rng.gauss(92 if neonatal_case else (132 if not has_hf else 155), 18))))
    bp_dia = max(40, min(130, int(rng.gauss(58 if neonatal_case else (78 if not has_hf else 92), 12))))

    high_risk_meds = 0
    if has_hf:
        high_risk_meds += rng.randint(0, 2)
    if has_dm:
        high_risk_meds += rng.randint(0, 1)
    if has_ckd:
        high_risk_meds += rng.randint(0, 1)
    high_risk_meds = min(high_risk_meds, 5)

    icu_days = 0
    if rng.random() < (0.25 if neonatal_case else 0.15):
        icu_days = rng.randint(1, 8)

    phone_access = False if neonatal_case else rng.random() < (0.74 if has_hiv or has_tb else 0.82)
    transport_diff = False if neonatal_case else rng.random() < (0.28 if has_hiv or has_tb else (0.35 if age > 70 else 0.15))
    lives_alone = False if neonatal_case else rng.random() < (0.30 if age > 65 else 0.12)

    # Logistic model for readmission probability
    log_odds = -3.2
    log_odds += 0.025 * max(0, age - 50)
    log_odds += 0.35 * min(prior_admissions, 5)
    log_odds += 0.08 * min(charlson, 8)
    log_odds += 0.04 * max(0, los - 3)
    log_odds += 0.5 if has_hf else 0
    log_odds += 0.3 if has_dm else 0
    log_odds += 0.4 if has_ckd else 0
    log_odds += 0.2 if has_malaria else 0
    log_odds += 0.45 if has_hiv else 0
    log_odds -= 0.12 if on_art else 0
    log_odds += 0.38 if has_tb else 0
    log_odds += 0.55 if has_sam else 0
    log_odds += 0.26 if has_sickle else 0
    log_odds += 0.62 if neonatal_risk else 0
    log_odds += 0.02 * max(0, 60 - egfr)
    log_odds += 0.15 * max(0, 10 - hemoglobin)
    log_odds += 0.12 * max(0, hba1c - 7)
    log_odds += 0.01 * max(0, bp_sys - 140)
    log_odds += 0.15 * high_risk_meds
    log_odds += 0.2 * icu_days
    log_odds += 0.3 if not phone_access else 0
    log_odds += 0.25 if transport_diff else 0
    log_odds += 0.2 if lives_alone else 0

    # Add noise
    log_odds += rng.gauss(0, 0.3)

    prob = sigmoid(log_odds)
    readmitted = 1 if rng.random() < prob else 0
    admission_date = date(2024, 1, 1) + timedelta(days=patient_index - 1)
    discharge_date = admission_date + timedelta(days=max(1, los))

    return {
        "patient_id": f"SYN-{patient_index:05d}",
        "admission_date": admission_date.isoformat(),
        "discharge_date": discharge_date.isoformat(),
        "age": age,
        "gender": gender,
        "prior_admissions_12m": prior_admissions,
        "length_of_stay_days": los,
        "charlson_index": charlson,
        "egfr": egfr,
        "hemoglobin": hemoglobin,
        "hba1c": hba1c,
        "bp_systolic": bp_sys,
        "bp_diastolic": bp_dia,
        "high_risk_medication_count": high_risk_meds,
        "icu_stay_days": icu_days,
        "phone_access": int(phone_access),
        "transportation_difficulty": int(transport_diff),
        "lives_alone": int(lives_alone),
        "has_heart_failure": int(has_hf),
        "has_diabetes": int(has_dm),
        "has_ckd": int(has_ckd),
        "has_malaria": int(has_malaria),
        "has_hiv": int(has_hiv),
        "on_art": int(on_art),
        "has_tuberculosis": int(has_tb),
        "has_severe_acute_malnutrition": int(has_sam),
        "has_sickle_cell_disease": int(has_sickle),
        "neonatal_risk": int(neonatal_risk),
        "readmitted_30d": readmitted,
    }


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic readmission dataset")
    parser.add_argument("--rows", type=int, default=5000, help="Number of patient rows")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument(
        "--output",
        type=str,
        default=str(Path(__file__).resolve().parents[1] / "data" / "synthetic_readmission_data.csv"),
        help="Output CSV path",
    )
    args = parser.parse_args()

    rng = random.Random(args.seed)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(",".join(FEATURE_COLUMNS) + "\n")
        for i in range(1, args.rows + 1):
            row = generate_row(i, rng)
            line = ",".join(str(row[col]) for col in FEATURE_COLUMNS)
            f.write(line + "\n")

    # Print summary
    with open(output_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    total = len(lines) - 1
    readmitted = sum(1 for line in lines[1:] if line.strip().endswith(",1"))
    print(f"Generated {total} rows -> {output_path}")
    print(f"Readmission rate: {readmitted}/{total} = {readmitted/total*100:.1f}%")


if __name__ == "__main__":
    main()
