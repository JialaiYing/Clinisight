from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.patient import PatientInput, PredictionResponse
from app.services.explain import DISCLAIMER, explain_patient, overall_risk_level
from app.services.inference import inference_service

router = APIRouter(tags=["predict"])


def _run_prediction(patient: PatientInput) -> PredictionResponse:
    if not inference_service.loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    try:
        risks, egfr = inference_service.predict(patient)
    except Exception as exc:  # noqa: BLE001 — bubble up as 500 for the client
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return PredictionResponse(
        risks=risks,
        explanations=explain_patient(patient, egfr),
        overall_risk_level=overall_risk_level(risks),  # type: ignore[arg-type]
        disclaimer=DISCLAIMER,
        computed_egfr=round(egfr, 1),
    )


@router.post("/predict", response_model=PredictionResponse)
def predict(patient: PatientInput) -> PredictionResponse:
    return _run_prediction(patient)


@router.post("/simulate", response_model=PredictionResponse)
def simulate(patient: PatientInput) -> PredictionResponse:
    # Same payload/response as /predict; separate path for the simulator UI.
    return _run_prediction(patient)
