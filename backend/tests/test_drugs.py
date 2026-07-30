"""Drug catalog and interaction alerts."""

from __future__ import annotations

from fastapi.testclient import TestClient

from ml.drugs import active_interactions, derived_flags
from tests.conftest import sample_patient


def test_ace_plus_spironolactone_flags_hyperkalemia() -> None:
    alerts = active_interactions(["lisinopril", "spironolactone"])
    assert any(a["outcome"] == "hyperkalemia" for a in alerts)


def test_ace_plus_nsaid_flags_aki() -> None:
    alerts = active_interactions(["lisinopril", "ibuprofen"])
    assert any(a["outcome"] == "aki" for a in alerts)
    flags = derived_flags(["lisinopril", "ibuprofen"])
    assert flags["on_ace_inhibitor"] and flags["on_nsaid"]


def test_predict_returns_interaction_alerts(client: TestClient) -> None:
    body = sample_patient(medications=["lisinopril", "spironolactone"])
    response = client.post("/predict", json=body)
    assert response.status_code == 200
    alerts = response.json()["interaction_alerts"]
    assert any(a["outcome"] == "hyperkalemia" for a in alerts)
