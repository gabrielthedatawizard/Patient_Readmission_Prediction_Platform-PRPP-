from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = (
    Path(__file__).resolve().parents[1] / "scripts" / "retrain_and_validate_real_data.py"
)
SPEC = importlib.util.spec_from_file_location("trip_retrain_validate", SCRIPT_PATH)
retrain_validate = importlib.util.module_from_spec(SPEC)
assert SPEC is not None and SPEC.loader is not None
SPEC.loader.exec_module(retrain_validate)


class RetrainAndValidateRealDataTestCase(unittest.TestCase):
    def test_is_normalized_training_csv_detects_expected_schema(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            csv_path = Path(temp_dir) / "normalized.csv"
            csv_path.write_text(
                "admission_date,discharge_date,age,gender,prior_admissions_12m,length_of_stay_days,charlson_index,readmitted_30d\n"
                "2025-01-01,2025-01-04,44,female,2,3,1,0\n",
                encoding="utf-8",
            )

            self.assertTrue(retrain_validate.is_normalized_training_csv(csv_path))

    def test_evaluate_gate_passes_when_metrics_and_ingestion_are_within_thresholds(self) -> None:
        metadata = {
            "dataset_rows": 480,
            "validation_metrics": {"roc_auc": 0.79},
            "test_metrics": {"roc_auc": 0.77, "recall": 0.31, "brier_score": 0.17},
        }
        ingestion_report = {
            "input_row_count": 500,
            "output_row_count": 480,
            "dropped_row_count": 10,
            "diagnosis_mapping_review_count": 20,
        }
        thresholds = {
            "min_labelled_rows": 200,
            "min_validation_roc_auc": 0.7,
            "min_test_roc_auc": 0.7,
            "min_test_recall": 0.25,
            "max_test_brier_score": 0.2,
            "max_dropped_row_rate": 0.05,
            "max_diagnosis_review_rate": 0.1,
        }

        result = retrain_validate.evaluate_gate(metadata, ingestion_report, thresholds)

        self.assertTrue(result["ready_for_clinical_review"])
        self.assertEqual(result["failed_metrics"], [])
        self.assertEqual(result["clinical_signoff"]["status"], "pending_review")

    def test_evaluate_gate_blocks_when_quality_metrics_fail(self) -> None:
        metadata = {
            "dataset_rows": 120,
            "validation_metrics": {"roc_auc": 0.62},
            "test_metrics": {"roc_auc": 0.61, "recall": 0.18, "brier_score": 0.28},
        }
        ingestion_report = {
            "input_row_count": 300,
            "output_row_count": 180,
            "dropped_row_count": 60,
            "diagnosis_mapping_review_count": 45,
        }
        thresholds = {
            "min_labelled_rows": 200,
            "min_validation_roc_auc": 0.7,
            "min_test_roc_auc": 0.7,
            "min_test_recall": 0.25,
            "max_test_brier_score": 0.2,
            "max_dropped_row_rate": 0.05,
            "max_diagnosis_review_rate": 0.1,
        }

        result = retrain_validate.evaluate_gate(metadata, ingestion_report, thresholds)

        self.assertFalse(result["ready_for_clinical_review"])
        self.assertIn("labelled_rows", result["failed_metrics"])
        self.assertIn("validation_roc_auc", result["failed_metrics"])
        self.assertIn("test_roc_auc", result["failed_metrics"])
        self.assertIn("test_recall", result["failed_metrics"])
        self.assertIn("test_brier_score", result["failed_metrics"])
        self.assertIn("dropped_row_rate", result["failed_metrics"])
        self.assertIn("diagnosis_review_rate", result["failed_metrics"])
        self.assertEqual(result["clinical_signoff"]["status"], "blocked")


if __name__ == "__main__":
    unittest.main()
