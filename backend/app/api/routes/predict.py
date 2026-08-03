from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.patient import PatientInput, PredictionResponse
from app.services.explain import (
    DISCLAIMER,
    explain_patient,
    overall_risk_level,
    recommend_patient,
)
from app.services.inference import inference_service, prediction_confidence
from ml.drugs import active_interactions


router = APIRouter(tags=["predict"])


def _run_prediction(patient: PatientInput) -> PredictionResponse:
    if not inference_service.loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    try:
        risks, egfr = inference_service.predict(patient)
        attributions = inference_service.attribute(patient)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return PredictionResponse(
        risks=risks,
        explanations=explain_patient(patient, egfr),
        recommendations=recommend_patient(patient, egfr, risks),
        attributions=attributions,
        interaction_alerts=active_interactions(patient.medications),
        overall_risk_level=overall_risk_level(risks),  # type: ignore[arg-type]
        confidence=prediction_confidence(risks),  # type: ignore[arg-type]
        calibration_applied=inference_service.calibration_applied,
        disclaimer=DISCLAIMER,
        computed_egfr=round(egfr, 1),
    )


@router.post("/predict", response_model=PredictionResponse)
def predict(patient: PatientInput) -> PredictionResponse:
    return _run_prediction(patient)


@router.post("/simulate", response_model=PredictionResponse)
def simulate(patient: PatientInput) -> PredictionResponse:
    # Same handler as /predict; own route so the what-if UI can stay distinct.
    return _run_prediction(patient)
