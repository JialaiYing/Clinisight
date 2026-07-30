"""Captum Integrated Gradients attribution smoke tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.schemas.patient import PatientInput
from app.services.inference import inference_service
from ml.generate_data import OUTCOME_COLS
from tests.conftest import sample_patient


def test_attribute_returns_all_outcomes() -> None:
    patient = PatientInput(**sample_patient())
    attributions = inference_service.attribute(patient)
    assert set(attributions.keys()) == set(OUTCOME_COLS)
    for drivers in attributions.values():
        assert len(drivers) <= 4
        for item in drivers:
            assert item["feature"]
            assert "contribution" in item


def test_predict_includes_attributions(client: TestClient) -> None:
    response = client.post(
        "/predict", json=sample_patient(medications=["lisinopril", "ibuprofen"])
    )
    assert response.status_code == 200
    body = response.json()
    aki_drivers = body["attributions"]["aki"]
    assert isinstance(aki_drivers, list)
    # High-nephrotoxin profile should surface at least one non-zero driver.
    assert any(abs(d["contribution"]) > 0 for d in aki_drivers)
