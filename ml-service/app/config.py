from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    service_name: str
    service_version: str
    model_artifact_path: Path
    request_timeout_ms: int


def get_settings() -> Settings:
    root = Path(__file__).resolve().parents[1]
    return Settings(
        service_name=os.getenv("ML_SERVICE_NAME", "trip-ml-service"),
        service_version=os.getenv("ML_SERVICE_VERSION", "1.0.0"),
        model_artifact_path=Path(
            os.getenv(
                "MODEL_ARTIFACT_PATH",
                root / "data" / "models" / "trip_clinical_model_v1.json",
            )
        ),
        request_timeout_ms=int(os.getenv("ML_REQUEST_TIMEOUT_MS", "5000")),
    )
