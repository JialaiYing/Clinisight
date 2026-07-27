from __future__ import annotations

from fastapi import APIRouter

from app.services.inference import inference_service

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok" if inference_service.loaded else "degraded",
        "model_loaded": inference_service.loaded,
        "device": str(inference_service.device),
    }
