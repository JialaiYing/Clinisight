"""Shared fixtures and sample patient payloads for backend tests."""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services.inference import inference_service


def sample_patient(**overrides: Any) -> dict[str, Any]:
    """Valid PatientInput payload; override fields as needed."""
    base: dict[str, Any] = {
        "age": 68,
        "sex": "female",
        "bmi": 29.5,
        "heart_rate": 82,
        "sbp": 138,
        "dbp": 78,
        "temperature": 98.4,
        "creatinine": 1.4,
        "potassium": 4.2,
        "sodium": 138,
        "ast": 28,
        "alt": 24,
        "hemoglobin": 12.1,
        "wbc": 7.2,
        "platelets": 220,
        "glucose": 118,
        "diabetes": True,
        "hypertension": True,
        "ckd": True,
        "liver_disease": False,
        "heart_failure": False,
        "medications": ["lisinopril", "ibuprofen", "metformin"],
        "num_concurrent_meds": 6,
    }
    base.update(overrides)
    return base


@pytest.fixture(scope="session", autouse=True)
def _load_model() -> None:
    """Ensure artifacts are loaded once for API tests (app lifespan may not run in TestClient)."""
    if not inference_service.loaded:
        inference_service.load(
            settings.model_path,
            settings.scaler_path,
            settings.calibrator_path,
        )


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
