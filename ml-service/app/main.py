from __future__ import annotations

from fastapi import FastAPI

from .config import get_settings
from .predictor import TripPredictor
from .schemas import HealthResponse, PredictionRequest, PredictionResponse


settings = get_settings()
predictor = TripPredictor(settings.model_artifact_path)

app = FastAPI(
    title="TRIP ML Service",
    version=settings.service_version,
    description="Inference service for clinical readmission risk scoring.",
)


@app.get("/", tags=["meta"])
def root() -> dict[str, str]:
    return {
        "service": settings.service_name,
        "version": settings.service_version,
        "health": "/health",
        "predict": "/api/v1/predict",
    }


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    snapshot = predictor.health()
    return HealthResponse(
        status=snapshot["status"],
        service=settings.service_name,
        service_version=settings.service_version,
        model_loaded=snapshot["model_loaded"],
        explainer_loaded=snapshot["explainer_loaded"],
        model_version=snapshot["model_version"],
        model_type=snapshot["model_type"],
        artifact_source=snapshot["artifact_source"],
    )


@app.post("/api/v1/predict", response_model=PredictionResponse, tags=["predict"])
def predict(request: PredictionRequest) -> PredictionResponse:
    result = predictor.predict(request.visitId, request.feature_payload())
    return PredictionResponse(**result)
