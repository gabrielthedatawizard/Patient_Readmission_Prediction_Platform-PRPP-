from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

import pandas as pd


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "train_model.py"
SPEC = importlib.util.spec_from_file_location("trip_train_model", SCRIPT_PATH)
train_model = importlib.util.module_from_spec(SPEC)
assert SPEC is not None and SPEC.loader is not None
SPEC.loader.exec_module(train_model)


class TrainModelTestCase(unittest.TestCase):
    def test_ensure_temporal_column_prefers_real_dates_and_sorts_rows(self) -> None:
        df = pd.DataFrame(
            {
                "patient_id": ["A", "B", "C"],
                "discharge_date": ["2024-01-03", "2024-01-01", None],
                "admission_date": ["2024-01-02", "2023-12-30", "2024-01-02"],
            }
        )

        normalized = train_model.ensure_temporal_column(df)

        self.assertEqual(normalized.attrs["event_date_source"], "discharge_date")
        self.assertEqual(normalized["patient_id"].tolist(), ["B", "C", "A"])
        self.assertEqual(
            normalized["_event_date"].dt.strftime("%Y-%m-%d").tolist(),
            ["2024-01-01", "2024-01-02", "2024-01-03"],
        )

    def test_temporal_split_preserves_order(self) -> None:
        df = pd.DataFrame(
            {
                "_event_date": pd.date_range("2024-01-01", periods=20, freq="D", tz="UTC"),
                "row_id": list(range(20)),
            }
        )

        train_df, validation_df, test_df = train_model.temporal_train_validation_test_split(df)

        self.assertEqual((len(train_df), len(validation_df), len(test_df)), (14, 3, 3))
        self.assertLess(train_df["_event_date"].max(), validation_df["_event_date"].min())
        self.assertLess(validation_df["_event_date"].max(), test_df["_event_date"].min())
        self.assertEqual(train_df["row_id"].tolist()[0], 0)
        self.assertEqual(test_df["row_id"].tolist()[-1], 19)

    def test_temporal_split_does_not_split_identical_boundary_dates(self) -> None:
        df = pd.DataFrame(
            {
                "_event_date": pd.to_datetime(
                    [
                        "2024-01-01",
                        "2024-01-02",
                        "2024-01-03",
                        "2024-01-04",
                        "2024-01-05",
                        "2024-01-06",
                        "2024-01-07",
                        "2024-01-08",
                        "2024-01-09",
                        "2024-01-10",
                        "2024-01-10",
                        "2024-01-11",
                    ],
                    utc=True,
                ),
                "row_id": list(range(12)),
            }
        )

        train_df, validation_df, test_df = train_model.temporal_train_validation_test_split(df)

        self.assertLess(train_df["_event_date"].max(), validation_df["_event_date"].min())
        self.assertLess(validation_df["_event_date"].max(), test_df["_event_date"].min())
        self.assertNotIn(10, train_df["row_id"].tolist())

    def test_resolve_calibration_config_degrades_gracefully_for_small_class_counts(self) -> None:
        self.assertEqual(train_model.resolve_calibration_config([0, 0, 1, 1, 1]), ("sigmoid", 2))
        self.assertEqual(train_model.resolve_calibration_config([0, 0, 0, 1, 1, 1]), ("isotonic", 3))
        self.assertEqual(train_model.resolve_calibration_config([1, 1, 1]), (None, None))


if __name__ == "__main__":
    unittest.main()
