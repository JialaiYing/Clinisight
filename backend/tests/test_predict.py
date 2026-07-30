"""API contract tests for /predict and /simulate."""

from __future__ import annotations

from fastapi.testclient import TestClient

from ml.generate_data import OUTCOME_COLS
from tests.conftest import sample_patient


def _assert_prediction_shape(payload: dict) -> None:
    assert set(payload["risks"].keys()) == set(OUTCOME_COLS)
    for name, value in payload["risks"].items():
        assert isinstance(value, float)
        assert 0.0 <= value <= 1.0, f"{name} risk out of bounds: {value}"

    assert payload["overall_risk_level"] in {"low", "moderate", "high"}
    assert payload["confidence"] in {"low", "moderate", "high"}
    assert isinstance(payload["calibration_applied"], bool)
    assert isinstance(payload["disclaimer"], str) and payload["disclaimer"]
    assert isinstance(payload["computed_egfr"], (int, float))
    assert 5.0 <= float(payload["computed_egfr"]) <= 140.0

    assert isinstance(payload["explanations"], dict)
    assert isinstance(payload["recommendations"], dict)
    assert isinstance(payload["attributions"], dict)
    assert isinstance(payload["interaction_alerts"], list)
    for outcome in OUTCOME_COLS:
        assert outcome in payload["explanations"]
        assert isinstance(payload["explanations"][outcome], list)
        assert outcome in payload["attributions"]
        drivers = payload["attributions"][outcome]
        assert isinstance(drivers, list)
        for item in drivers:
            assert "feature" in item and "contribution" in item
            assert isinstance(item["contribution"], (int, float))


def test_predict_returns_valid_contract(client: TestClient) -> None:
    response = client.post("/predict", json=sample_patient())
    assert response.status_code == 200
    _assert_prediction_shape(response.json())


def test_simulate_matches_predict_contract(client: TestClient) -> None:
    body = sample_patient(medications=["insulin", "metformin", "lisinopril"])
    predict = client.post("/predict", json=body)
    simulate = client.post("/simulate", json=body)
    assert predict.status_code == 200
    assert simulate.status_code == 200
    _assert_prediction_shape(simulate.json())
    assert predict.json()["risks"] == simulate.json()["risks"]
    assert predict.json()["computed_egfr"] == simulate.json()["computed_egfr"]


def test_predict_rejects_invalid_payload(client: TestClient) -> None:
    bad = sample_patient(age=10)
    response = client.post("/predict", json=bad)
    assert response.status_code == 422


def test_computed_egfr_consistent_with_helper(client: TestClient) -> None:
    import numpy as np

    from ml.generate_data import ckd_epi_2021_egfr

    body = sample_patient(age=68, sex="female", creatinine=1.4)
    response = client.post("/predict", json=body)
    assert response.status_code == 200

    expected = float(
        ckd_epi_2021_egfr(np.array([1.4]), np.array([68.0]), np.array([0.0]))[0]
    )
    expected = round(float(np.clip(expected, 5.0, 140.0)), 1)
    assert response.json()["computed_egfr"] == expected
