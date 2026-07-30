"""Serve exported model-card metrics for the frontend."""

from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException

from app.core.config import settings

router = APIRouter(tags=["metrics"])


@router.get("/metrics")
def get_metrics() -> dict:
    path = settings.metrics_path
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail="metrics.json not found. Run: python -m ml.evaluate",
        )
    with open(path, encoding="utf-8") as f:
        return json.load(f)
