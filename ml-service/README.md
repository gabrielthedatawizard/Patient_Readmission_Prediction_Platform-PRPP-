# TRIP ML Service

Python inference service for the TRIP backend.

## What It Does

- exposes `GET /health`
- exposes `POST /api/v1/predict`
- loads a versioned model artifact from `data/models/`
- returns deterministic risk scores, confidence, intervals, and explainable factors

## Run Locally

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload
```

## Generate Synthetic Training Data

The bundled training dataset now includes Tanzania-priority clinical features plus
`admission_date` and `discharge_date` so the trainer can evaluate on time-ordered windows.

```bash
cd ml-service
python3 scripts/generate_synthetic_data.py --rows 5000 --output data/synthetic_readmission_data.csv
```

## Train Temporal Model

```bash
cd ml-service
python3 scripts/train_model.py --data-path data/synthetic_readmission_data.csv --output-dir data/models
```

Notes:

- The trainer uses `discharge_date`, `admission_date`, or other event-date columns to build train, validation, and test windows in chronological order.
- If no date column is present, the trainer falls back to row order and records that source in `data/models/model_metadata.json`.
- The saved metadata now includes candidate validation metrics, shipped-artifact validation/test metrics, temporal split windows, and calibration details.
- Use `--skip-shap` during quick smoke tests if you want to avoid generating the explainer artifact.

## Normalize Real Backend Exports

When pilot-facility data is available, first export encounter rows from the backend and normalize them
into the temporal training schema.

```bash
cd ml-service
python3 scripts/ingest_real_data.py /path/to/trip-training-dataset.json data/real/trip_training_dataset_normalized.csv
```

Notes:

- The ingester accepts both JSON and CSV exports from `/api/analytics/ml/training-dataset`.
- It converts backend camelCase rows into the snake_case fields expected by `scripts/train_model.py`.
- Rows without a usable admission/discharge date or a binary `readmitted30d` label are dropped from the training CSV and recorded in the JSON report.
- The JSON report highlights diagnosis rows that still need mapping review, including free-text diagnoses and rows relying only on explicit condition flags.
- Use `--strict` during pilot onboarding if you want the command to fail whenever rows are dropped or diagnosis mapping review is still pending.

## Example Request

```bash
curl -X POST http://localhost:5001/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{
    "visitId": "VIS-TRIP-DEMO-0001",
    "features": {
      "age": 72,
      "gender": "female",
      "diagnosis": "I50.9",
      "diagnoses": ["I50.9", "N18.3"],
      "priorAdmissions6mo": 1,
      "priorAdmissions12m": 3,
      "lengthOfStayDays": 12,
      "charlsonIndex": 5,
      "egfr": 41,
      "hemoglobin": 9.4,
      "hba1c": 8.7,
      "bpSystolic": 152,
      "bpDiastolic": 94,
      "highRiskMedicationCount": 2,
      "icuStayDays": 2,
      "phoneAccess": false,
      "transportationDifficulty": true,
      "livesAlone": true,
      "hasHeartFailure": true,
      "hasDiabetes": false,
      "hasCkd": true,
      "hasHiv": true,
      "onArt": true,
      "hasTuberculosis": false,
      "hasMalaria": false,
      "neonatalRisk": false
    }
  }'
```

## Health Response

```json
{
  "status": "healthy",
  "service": "trip-ml-service",
  "model_loaded": true,
  "explainer_loaded": true,
  "model_version": "trip-clinical-logit-v1"
}
```

## Tests

```bash
cd ml-service
python3 -m unittest discover -s tests -t .
```

This covers both predictor behavior and the temporal training helpers.

## Calibrate From Real Exports

Once the backend is running with real encounter data, export a labelled training set from:

- `/api/analytics/ml/training-dataset?labelledOnly=true`

Recommended workflow:

```bash
cd ml-service
python3 scripts/ingest_real_data.py /path/to/training-dataset.json data/real/trip_training_dataset_normalized.csv
python3 scripts/train_model.py --data-path data/real/trip_training_dataset_normalized.csv --output-dir data/models
```

## Final Clinical Validation Gate

When pilot data is ready, use the end-to-end gate below to normalize, retrain, validate, and produce
a clinical readiness report in one step.

```bash
cd ml-service
python3 scripts/retrain_and_validate_real_data.py /path/to/training-dataset.json \
  --normalized-output data/real/trip_training_dataset_normalized.csv \
  --model-output-dir data/models/real_validation_run \
  --report-path data/models/clinical_validation_report.json
```

Notes:

- The script accepts either a raw backend export or an already normalized training CSV.
- It writes a JSON report with ingestion quality, temporal validation/test metrics, gate checks, and a clinical sign-off checklist.
- By default it fails if the ingestion step drops rows or still has diagnosis mapping review gaps. Use `--allow-ingestion-gaps` only for exploratory dry runs.
- The default gate thresholds are configurable from the CLI and include minimum temporal ROC AUC, minimum test recall, maximum Brier score, and maximum data-quality loss.

Then build a refreshed artifact:

```bash
cd ml-service
python3 scripts/build_artifact_from_export.py /path/to/training-dataset.json
```

This writes a calibrated artifact to `data/models/trip_clinical_model_calibrated.json` using the
real exported feature/outcome distribution as a lightweight interim retraining step.
