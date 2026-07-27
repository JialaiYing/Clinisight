from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class Sex(str, Enum):
    female = "female"
    male = "male"


class MedicationClass(str, Enum):
    none = "none"
    antihypertensive = "antihypertensive"
    antidiabetic = "antidiabetic"
    antibiotic = "antibiotic"
    analgesic = "analgesic"


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

    medication_class: MedicationClass = MedicationClass.none
    num_concurrent_meds: int = Field(0, ge=0, le=30)
    on_nsaid: bool = False
    on_ace_inhibitor: bool = False
    on_anticoagulant: bool = False
    on_insulin: bool = False


class PredictionResponse(BaseModel):
    risks: dict[str, float]
    explanations: dict[str, list[str]]
    overall_risk_level: Literal["low", "moderate", "high"]
    disclaimer: str
    computed_egfr: float
