from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "ingest_real_data.py"
SPEC = importlib.util.spec_from_file_location("trip_ingest_real_data", SCRIPT_PATH)
ingest_real_data = importlib.util.module_from_spec(SPEC)
assert SPEC is not None and SPEC.loader is not None
SPEC.loader.exec_module(ingest_real_data)


class IngestRealDataTestCase(unittest.TestCase):
    def test_normalize_row_converts_backend_export_to_training_schema(self) -> None:
        raw_row = {
            "facilityId": "fac-001",
            "visitId": "VIS-001",
            "admissionDate": "2025-02-01T08:30:00Z",
            "dischargeDate": "2025-02-05T10:15:00Z",
            "ward": "Medical",
            "diagnosis": "B20.1",
            "diagnoses": ["B20.1", "A15.0"],
            "age": 43,
            "gender": "female",
            "priorAdmissions12m": 2,
            "lengthOfStayDays": 4,
            "charlsonIndex": 3,
            "egfr": 68,
            "hemoglobin": 10.5,
            "hba1c": 6.4,
            "bpSystolic": 136,
            "bpDiastolic": 84,
            "highRiskMedicationCount": 1,
            "icuStayDays": 0,
            "phoneAccess": True,
            "transportationDifficulty": False,
            "livesAlone": False,
            "onArt": True,
            "readmitted30d": 1,
            "daysToReadmission": 18,
        }

        normalized_row, drop_reason, review_details = ingest_real_data.normalize_row(raw_row, 1)

        self.assertIsNone(drop_reason)
        self.assertIsNotNone(normalized_row)
        assert normalized_row is not None
        self.assertEqual(normalized_row["facility_id"], "fac-001")
        self.assertEqual(normalized_row["visit_id"], "VIS-001")
        self.assertEqual(normalized_row["diagnosis_mapping_status"], "coded")
        self.assertEqual(normalized_row["readmitted_30d"], 1)
        self.assertEqual(normalized_row["has_hiv"], 1)
        self.assertEqual(normalized_row["on_art"], 1)
        self.assertIn("hiv", normalized_row["tanzania_priority_conditions"])
        self.assertEqual(review_details["diagnosisMappingStatus"], "coded")

    def test_report_captures_dropped_rows_and_mapping_review(self) -> None:
        rows = [
            {
                "facilityId": "fac-001",
                "visitId": "VIS-001",
                "admissionDate": "2025-02-01T08:30:00Z",
                "dischargeDate": "2025-02-05T10:15:00Z",
                "diagnosis": "B20.1",
                "age": 43,
                "gender": "female",
                "priorAdmissions12m": 2,
                "lengthOfStayDays": 4,
                "charlsonIndex": 3,
                "egfr": 68,
                "hemoglobin": 10.5,
                "hba1c": 6.4,
                "bpSystolic": 136,
                "bpDiastolic": 84,
                "highRiskMedicationCount": 1,
                "icuStayDays": 0,
                "phoneAccess": True,
                "transportationDifficulty": False,
                "livesAlone": False,
                "readmitted30d": 1,
            },
            {
                "facilityId": "fac-002",
                "visitId": "VIS-002",
                "admissionDate": "2025-03-01T08:30:00Z",
                "dischargeDate": "2025-03-03T10:15:00Z",
                "diagnosis": "sepsis",
                "age": 51,
                "gender": "male",
                "priorAdmissions12m": 1,
                "lengthOfStayDays": 2,
                "charlsonIndex": 1,
                "egfr": 90,
                "hemoglobin": 12.1,
                "hba1c": 5.8,
                "bpSystolic": 128,
                "bpDiastolic": 76,
                "highRiskMedicationCount": 0,
                "icuStayDays": 0,
                "phoneAccess": True,
                "transportationDifficulty": False,
                "livesAlone": False,
                "readmitted30d": 0,
            },
            {
                "facilityId": "fac-003",
                "visitId": "VIS-003",
                "diagnosis": "A15.0",
                "age": 37,
                "gender": "female",
                "priorAdmissions12m": 1,
                "lengthOfStayDays": 2,
                "charlsonIndex": 1,
                "egfr": 91,
                "hemoglobin": 12.7,
                "hba1c": 5.4,
                "bpSystolic": 122,
                "bpDiastolic": 75,
                "highRiskMedicationCount": 0,
                "icuStayDays": 0,
                "phoneAccess": True,
                "transportationDifficulty": False,
                "livesAlone": False,
                "readmitted30d": 0,
            },
            {
                "facilityId": "fac-004",
                "visitId": "VIS-004",
                "admissionDate": "2025-04-01T08:30:00Z",
                "dischargeDate": "2025-04-03T10:15:00Z",
                "diagnosis": "I50.9",
                "age": 65,
                "gender": "female",
                "priorAdmissions12m": 3,
                "lengthOfStayDays": 5,
                "charlsonIndex": 4,
                "egfr": 54,
                "hemoglobin": 9.8,
                "hba1c": 7.9,
                "bpSystolic": 148,
                "bpDiastolic": 92,
                "highRiskMedicationCount": 2,
                "icuStayDays": 0,
                "phoneAccess": False,
                "transportationDifficulty": True,
                "livesAlone": True,
                "labelAvailable": False,
            },
        ]

        normalized_rows = []
        dropped_reasons = ingest_real_data.Counter()
        diagnosis_statuses = ingest_real_data.Counter()
        review_examples = []

        for index, raw_row in enumerate(rows, start=1):
            normalized_row, drop_reason, review_details = ingest_real_data.normalize_row(raw_row, index)
            if drop_reason:
                dropped_reasons[drop_reason] += 1
                continue

            assert normalized_row is not None
            normalized_rows.append(normalized_row)
            diagnosis_statuses[normalized_row["diagnosis_mapping_status"]] += 1
            if normalized_row["diagnosis_mapping_status"] != "coded":
                review_examples.append(review_details)

        report = ingest_real_data.build_report(
            Path("sample.json"),
            len(rows),
            normalized_rows,
            dropped_reasons,
            diagnosis_statuses,
            review_examples,
        )

        self.assertEqual(len(normalized_rows), 2)
        self.assertEqual(report["dropped_reasons"]["missing_temporal_date"], 1)
        self.assertEqual(report["dropped_reasons"]["missing_training_label"], 1)
        self.assertEqual(report["diagnosis_mapping_status_breakdown"]["coded"], 1)
        self.assertEqual(report["diagnosis_mapping_status_breakdown"]["free_text"], 1)
        self.assertEqual(report["diagnosis_mapping_review_count"], 1)
        self.assertEqual(report["positive_count"], 1)

    def test_main_writes_csv_and_report(self) -> None:
        payload = {
            "rows": [
                {
                    "facilityId": "fac-010",
                    "visitId": "VIS-010",
                    "admissionDate": "2025-05-01T08:30:00Z",
                    "dischargeDate": "2025-05-04T09:00:00Z",
                    "diagnosis": "A15.0",
                    "age": 29,
                    "gender": "male",
                    "priorAdmissions12m": 1,
                    "lengthOfStayDays": 3,
                    "charlsonIndex": 1,
                    "egfr": 97,
                    "hemoglobin": 13.2,
                    "hba1c": 5.3,
                    "bpSystolic": 118,
                    "bpDiastolic": 73,
                    "highRiskMedicationCount": 0,
                    "icuStayDays": 0,
                    "phoneAccess": True,
                    "transportationDifficulty": False,
                    "livesAlone": False,
                    "readmitted30d": 0,
                }
            ]
        }

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            input_path = temp_path / "export.json"
            output_path = temp_path / "normalized.csv"
            report_path = temp_path / "normalized.report.json"
            input_path.write_text(json.dumps(payload), encoding="utf-8")

            original_parse_args = ingest_real_data.parse_args
            try:
                ingest_real_data.parse_args = lambda: type(
                    "Args",
                    (),
                    {
                        "input_path": input_path,
                        "output_path": output_path,
                        "report_path": report_path,
                        "strict": False,
                    },
                )()
                exit_code = ingest_real_data.main()
            finally:
                ingest_real_data.parse_args = original_parse_args

            self.assertEqual(exit_code, 0)
            self.assertTrue(output_path.exists())
            self.assertTrue(report_path.exists())
            self.assertIn("readmitted_30d", output_path.read_text(encoding="utf-8"))
            report = json.loads(report_path.read_text(encoding="utf-8"))
            self.assertEqual(report["output_row_count"], 1)


if __name__ == "__main__":
    unittest.main()
