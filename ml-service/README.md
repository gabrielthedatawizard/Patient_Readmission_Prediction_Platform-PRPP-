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
      "hasCkd": true
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

## Calibrate From Real Exports

Once the backend is running with real encounter data, export a labelled training set from:

- `/api/analytics/ml/training-dataset?labelledOnly=true`

Then build a refreshed artifact:

```bash
cd ml-service
python3 scripts/build_artifact_from_export.py /path/to/training-dataset.json
```

This writes a calibrated artifact to `data/models/trip_clinical_model_calibrated.json` using the
real exported feature/outcome distribution as a lightweight interim retraining step.
