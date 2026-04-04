from __future__ import annotations

import unittest
from pathlib import Path

from app.predictor import TripPredictor


class TripPredictorTestCase(unittest.TestCase):
    def setUp(self) -> None:
        artifact_path = (
            Path(__file__).resolve().parents[1]
            / "data"
            / "models"
            / "trip_clinical_model_v1.json"
        )
        self.predictor = TripPredictor(artifact_path)

    def test_high_risk_profile_scores_higher_than_low_risk_profile(self) -> None:
        high_risk = self.predictor.predict(
            "VIS-HIGH",
            {
                "age": 81,
                "diagnoses": ["I50.9", "N18.3", "E11.9"],
                "priorAdmissions6mo": 2,
                "priorAdmissions12m": 4,
                "lengthOfStayDays": 12,
                "charlsonIndex": 6,
                "egfr": 34,
                "hemoglobin": 8.9,
                "hba1c": 9.2,
                "bpSystolic": 160,
                "bpDiastolic": 98,
                "highRiskMedicationCount": 3,
                "icuStayDays": 2,
                "phoneAccess": False,
                "transportationDifficulty": True,
                "livesAlone": True,
                "hasMalaria": True,
                "hasHiv": True,
                "hasTb": True,
                "hasSam": True,
                "hasSickleCell": True,
            },
        )
        low_risk = self.predictor.predict(
            "VIS-LOW",
            {
                "age": 32,
                "diagnoses": ["J06.9"],
                "priorAdmissions6mo": 0,
                "priorAdmissions12m": 0,
                "lengthOfStayDays": 2,
                "charlsonIndex": 0,
                "egfr": 90,
                "hemoglobin": 13.8,
                "hba1c": 5.4,
                "bpSystolic": 118,
                "bpDiastolic": 74,
                "highRiskMedicationCount": 0,
                "icuStayDays": 0,
                "phoneAccess": True,
                "transportationDifficulty": False,
                "livesAlone": False,
                "hasMalaria": False,
                "hasHiv": False,
                "hasTb": False,
                "hasSam": False,
                "hasSickleCell": False,
            },
        )

        self.assertGreater(high_risk["score"], low_risk["score"])
        self.assertEqual(high_risk["tier"], "High")
        self.assertEqual(low_risk["tier"], "Low")

    def test_missing_critical_fields_reduce_completeness(self) -> None:
        prediction = self.predictor.predict(
            "VIS-MISSING",
            {
                "age": 67,
                "diagnoses": ["I50.9"],
                "priorAdmissions12m": 2,
                "lengthOfStayDays": 8,
                "charlsonIndex": 4,
                "phoneAccess": False,
                "transportationDifficulty": True,
                "livesAlone": True,
            },
        )

        self.assertLess(prediction["dataQuality"]["completeness"], 1.0)
        self.assertGreater(len(prediction["dataQuality"]["missingCriticalFields"]), 0)
        self.assertGreater(len(prediction["factors"]), 0)

    def test_tanzania_priority_features_surface_in_analysis_and_raise_risk(self) -> None:
        tanzania_priority = self.predictor.predict(
            "VIS-TZ",
            {
                "age": 0,
                "gender": "female",
                "ward": "NICU",
                "diagnoses": ["B20.1", "A15.0", "E43", "D57.0", "B50.9"],
                "medications": [{"name": "Tenofovir/Lamivudine/Dolutegravir"}],
                "priorAdmissions6mo": 1,
                "priorAdmissions12m": 2,
                "lengthOfStayDays": 9,
                "charlsonIndex": 3,
                "egfr": 82,
                "hemoglobin": 8.8,
                "hba1c": 5.2,
                "bpSystolic": 96,
                "bpDiastolic": 60,
                "highRiskMedicationCount": 0,
                "icuStayDays": 2,
                "phoneAccess": False,
                "transportationDifficulty": False,
                "livesAlone": False,
                "ageInDays": 12,
                "gestationalAgeWeeks": 35,
                "birthWeightGrams": 2100,
            },
        )
        low_risk = self.predictor.predict(
            "VIS-BASELINE",
            {
                "age": 25,
                "gender": "female",
                "diagnoses": ["J06.9"],
                "priorAdmissions6mo": 0,
                "priorAdmissions12m": 0,
                "lengthOfStayDays": 2,
                "charlsonIndex": 0,
                "egfr": 90,
                "hemoglobin": 13.4,
                "hba1c": 5.1,
                "bpSystolic": 118,
                "bpDiastolic": 72,
                "highRiskMedicationCount": 0,
                "icuStayDays": 0,
                "phoneAccess": True,
                "transportationDifficulty": False,
                "livesAlone": False,
            },
        )

        self.assertGreater(tanzania_priority["score"], low_risk["score"])
        self.assertIn("hiv", tanzania_priority["analysisSummary"]["tanzaniaPriorityConditions"])
        self.assertIn("tuberculosis", tanzania_priority["analysisSummary"]["tanzaniaPriorityConditions"])
        self.assertIn("neonatal_risk", tanzania_priority["analysisSummary"]["tanzaniaPriorityConditions"])
        self.assertIn("on_art", tanzania_priority["analysisSummary"]["treatmentSignals"])
        self.assertIn("prematurity", tanzania_priority["analysisSummary"]["neonatalRiskFactors"])


if __name__ == "__main__":
    unittest.main()
