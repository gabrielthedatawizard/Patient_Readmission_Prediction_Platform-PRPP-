# Model Card: TRIP 30-Day Readmission Risk Predictor

## 1. Model Details
**Model Name:** TRIP Readmission Risk Surrogate (v2)  
**Model Type:** L2-Regularized Logistic Regression  
**Developers:** Ministry of Health, Tanzania & TRIP Engine Team  
**Date Validated:** [INSERT DATE]  
**Algorithm Focus:** Binary classification predicting the likelihood of an unplanned readmission within 30 days of discharge.

## 2. Intended Use
**Primary Use Case:** Clinical decision support at the point of discharge. Generates a risk score (0-100%) and stratifies patients into High, Medium, or Low risk to determine the intensity of follow-up care (e.g., CHW dispatch, phone calls).  
**Out of Scope End-Users:** This model is **not** to be used for diagnostic purposes, rationing care, or denying discharge. It does not replace clinical judgment.

## 3. Factors and Features
The model operates on 18 core clinical and demographic features, normalized and passed through localized clinical mapping functions (NEML, CTC2, eLMIS data):
- **Demographics:** Age (scaled), Transportation difficulty, Phone access, Living arrangements (flag).
- **Clinical History:** Prior admissions (12-month and 6-month), Length of current stay.
- **Diagnostics/Vitals:** HbA1c risk, eGFR low severity, Anemia severity (Hemoglobin), Elevated blood pressure.
- **Comorbidities:** Charlson Comorbidity Index, Heart Failure, Diabetes, CKD, Malaria, TB, Sickle Cell Disease.
- **HIV Status:** HIV positive flag, ART coverage gap flag.

## 4. Evaluation Data & Metrics
**Validation Dataset Summary:**
- [X,XXX] historical encounters across [Y] referral and district hospitals in Tanzania.
- Date Range: [YYYY-MM] to [YYYY-MM]

**Performance Metrics Target:**
- **ROC AUC:** >= 0.78 (Demonstrates good separability between readmitted and non-readmitted populations)
- **Precision (High Risk Tier):** >= 0.40 (Ensures CHW interventions are efficiently targeted)
- **Recall (High + Medium Tiers):** >= 0.85 (Captures the vast majority of actual eventual readmissions)

## 5. Fairness & Ethical Considerations
**Geographic Equity:** Evaluated for performance parity between urban (e.g., Dar es Salaam) and rural (e.g., Kigoma) facility cohorts.
**Socioeconomic Fairness:** Living conditions (no phone, transport difficulty) are factored positively into risk, ensuring vulnerable populations receive higher prioritization for field follow-up rather than being excluded.
**Missing Data:** Uses robust fallback imputations. Clinician override is tracked in the audit tables if missing data skews the prediction artificially low.

## 6. Caveats and Limitations
- **Data Latency:** Dependent on real-time FHIR/client registry updates. In offline modes, the browser-cached surrogate model is used, which does not learn continuously until the next device sync.
- **Emerging Diseases:** Not attuned to sudden acute epidemic spikes (e.g., Cholera outbreak) unless specifically re-weighted or retrained.
