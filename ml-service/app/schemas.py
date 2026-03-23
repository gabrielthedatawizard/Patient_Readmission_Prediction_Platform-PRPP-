from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PredictionRequest(BaseModel):
    visitId: str | None = None
    features: dict[str, Any] | None = None

    model_config = ConfigDict(extra="allow")

    def feature_payload(self) -> dict[str, Any]:
        if isinstance(self.features, dict):
            return self.features

        extras = self.model_extra or {}
        return {
            key: value
            for key, value in extras.items()
            if key not in {"visitId", "features"}
        }


class FactorResponse(BaseModel):
    factor: str
    weight: float
    contribution: float
    direction: str
    impact: str


class PredictionResponse(BaseModel):
    visitId: str | None = None
    score: int
    tier: str
    probability: float
    confidence: float
    confidenceInterval: dict[str, int]
    factors: list[FactorResponse]
    explanation: str
    modelVersion: str
    modelType: str
    method: str = "ml"
    dataQuality: dict[str, Any]
    analysisSummary: dict[str, Any] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str
    service: str
    service_version: str
    model_loaded: bool
    explainer_loaded: bool
    model_version: str
    model_type: str
    artifact_source: str
