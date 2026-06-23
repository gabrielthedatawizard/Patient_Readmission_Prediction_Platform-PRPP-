# Model Card: TRIP 30-Day Readmission Risk Predictor

## 1. Model Details
**Model Name:** TRIP Readmission Risk Predictor  
**Model Version:** `trip-tz-submodels-v2.1`  
**Model Type:** L2-Regularized Logistic Regression with isotonic probability calibration, plus disease-specific sub-models (malaria, HIV, TB, severe acute malnutrition, sickle cell disease) that route by condition at inference time.  
**Developers:** Ministry of Health, Tanzania & TRIP Engine Team  
**Date Validated:** 2026-06-23 (synthetic developmental dataset — see §4). **Real-world clinical validation: PENDING.**  
**Algorithm Focus:** Binary classification predicting the likelihood of an unplanned readmission within 30 days of discharge.

## 2. Intended Use
**Primary Use Case:** Clinical decision support at the point of discharge. Generates a risk score (0-100%) and stratifies patients into High, Medium, or Low risk to determine the intensity of follow-up care (e.g., CHW dispatch, phone calls).  
**Out of Scope End-Users:** This model is **not** to be used for diagnostic purposes, rationing care, or denying discharge. It does not replace clinical judgment.

## 3. Factors and Features
The model operates on 25 clinical, demographic, and social features, normalized and passed through localized clinical mapping functions (NEML, CTC2, eLMIS data):
- **Demographics & Social:** Age, Gender, Transportation difficulty, Phone access, Lives alone.
- **Clinical History:** Prior admissions (12-month), Length of current stay, ICU stay days, High-risk medication count.
- **Diagnostics/Vitals:** HbA1c, eGFR, Hemoglobin (anemia), Systolic & diastolic blood pressure.
- **Comorbidities:** Charlson Comorbidity Index, Heart Failure, Diabetes, CKD, Malaria, TB, Severe Acute Malnutrition, Sickle Cell Disease.
- **HIV Status:** HIV positive flag, ART coverage flag.
- **Neonatal:** Neonatal risk flag (prematurity / low birth weight / NICU context).

## 4. Evaluation Data & Metrics

> **⚠️ Developmental status:** The metrics below were produced on a **synthetic
> dataset** generated to exercise the training and serving pipeline, *not* on
> real patient encounters. They establish that the pipeline trains, calibrates,
> and serves correctly — they are **not** evidence of clinical performance.
> Real-world validation against de-identified Tanzanian hospital data is
> required before any deployment that influences patient care.

**Evaluation Dataset Summary (synthetic):**
- 5,000 synthetic encounters; 24.6% 30-day readmission rate.
- Time-ordered split by discharge date: 3,500 train / 751 validation / 749 test (no temporal leakage).
- Calibration: isotonic regression (3-fold).

**Achieved metrics (calibrated global model, synthetic temporal test set, 0.50 decision threshold):**

| Metric | Validation | Test | Target |
|---|---|---|---|
| ROC AUC | 0.789 | 0.777 | >= 0.78 |
| Precision | 0.619 | 0.655 | >= 0.40 |
| Recall | 0.296 | 0.302 | >= 0.85 |
| F1 | 0.400 | 0.414 | — |
| Accuracy | 0.792 | 0.792 | — |
| Brier score | 0.143 | 0.147 | lower is better |

**Notes on the metrics:**
- ROC AUC meets the separability target on synthetic data.
- **Recall at the 0.50 threshold falls well short of the 0.85 target.** In
  production the tiering thresholds (Medium ≥ 0.40, High ≥ 0.70) and the
  combined High+Medium tier — not a single 0.50 cutoff — determine follow-up
  intensity; sensitivity should be re-measured against those tier boundaries on
  real labelled data, and the threshold tuned to hit the recall target.
- Five disease-specific sub-models (malaria, HIV, TB, severe acute malnutrition,
  sickle cell disease) are trained and routed at inference; their per-cohort
  performance should be reported separately once real data is available.

**Performance Metrics Target (acceptance gate for real-world validation):**
- **ROC AUC:** >= 0.78 (good separability between readmitted and non-readmitted populations)
- **Precision (High Risk Tier):** >= 0.40 (ensures CHW interventions are efficiently targeted)
- **Recall (High + Medium Tiers):** >= 0.85 (captures the majority of eventual readmissions)

## 5. Fairness & Ethical Considerations
**Geographic Equity:** Evaluated for performance parity between urban (e.g., Dar es Salaam) and rural (e.g., Kigoma) facility cohorts.
**Socioeconomic Fairness:** Living conditions (no phone, transport difficulty) are factored positively into risk, ensuring vulnerable populations receive higher prioritization for field follow-up rather than being excluded.
**Missing Data:** Uses robust fallback imputations. Clinician override is tracked in the audit tables if missing data skews the prediction artificially low.

## 6. Caveats and Limitations
- **Data Latency:** Dependent on real-time FHIR/client registry updates. In offline modes, the browser-cached surrogate model is used, which does not learn continuously until the next device sync.
- **Emerging Diseases:** Not attuned to sudden acute epidemic spikes (e.g., Cholera outbreak) unless specifically re-weighted or retrained.
