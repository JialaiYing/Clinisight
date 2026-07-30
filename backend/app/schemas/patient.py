from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from ml.drugs import DRUG_IDS


class Sex(str, Enum):
    female = "female"
    male = "male"


class PatientInput(BaseModel):
    age: float = Field(..., ge=18, le=120)
    sex: Sex
    bmi: float = Field(..., ge=10, le=80)

    heart_rate: float = Field(..., ge=30, le=220)
    sbp: float = Field(..., ge=60, le=250)
    dbp: float = Field(..., ge=30, le=150)
    temperature: float = Field(..., ge=90, le=110)

    # eGFR is derived server-side from creatinine/age/sex (avoids inconsistent pairs).
    creatinine: float = Field(..., ge=0.1, le=20, description="Serum creatinine mg/dL")
    potassium: float = Field(..., ge=1.5, le=9)
    sodium: float = Field(..., ge=110, le=170)
    ast: float = Field(..., ge=1, le=2000)
    alt: float = Field(..., ge=1, le=2000)
    hemoglobin: float = Field(..., ge=3, le=22)
    wbc: float = Field(..., ge=0.5, le=50)
    platelets: float = Field(..., ge=10, le=1000)
    glucose: float = Field(..., ge=30, le=600)

    diabetes: bool = False
    hypertension: bool = False
    ckd: bool = False
    liver_disease: bool = False
    heart_failure: bool = False

    # Curated high-risk inpatient drugs (multi-select). Concurrent count may exceed
    # len(medications) to represent other unlisted home/hospital meds.
    medications: list[str] = Field(default_factory=list, max_length=30)
    num_concurrent_meds: int = Field(0, ge=0, le=30)

    @field_validator("medications")
    @classmethod
    def _validate_meds(cls, value: list[str]) -> list[str]:
        allowed = set(DRUG_IDS)
        cleaned: list[str] = []
        seen: set[str] = set()
        for mid in value:
            if mid not in allowed:
                raise ValueError(f"Unknown medication id: {mid}")
            if mid not in seen:
                cleaned.append(mid)
                seen.add(mid)
        return cleaned


class AttributionItem(BaseModel):
    """Signed contribution from Captum Integrated Gradients (scaled-feature space)."""

    feature: str
    feature_key: str
    contribution: float


class InteractionAlert(BaseModel):
    outcome: str
    message: str


class PredictionResponse(BaseModel):
    risks: dict[str, float]
    explanations: dict[str, list[str]]
    recommendations: dict[str, list[str]] = Field(default_factory=dict)
    attributions: dict[str, list[AttributionItem]] = Field(default_factory=dict)
    interaction_alerts: list[InteractionAlert] = Field(default_factory=list)
    overall_risk_level: Literal["low", "moderate", "high"]
    confidence: Literal["low", "moderate", "high"] = "moderate"
    calibration_applied: bool = False
    disclaimer: str
    computed_egfr: float
