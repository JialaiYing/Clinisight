"""Calibration helpers and metrics endpoint smoke tests."""

from __future__ import annotations

import numpy as np
from fastapi.testclient import TestClient

from ml.calibration import apply_temperature, brier_score, fit_temperatures


def test_temperature_fit_produces_positive_temps() -> None:
    rng = np.random.default_rng(0)
    logits = rng.normal(size=(200, 6))
    labels = (rng.random(size=(200, 6)) < 0.3).astype(np.float64)
    temps = fit_temperatures(logits, labels, max_iter=20)
    assert temps.shape == (6,)
    assert np.all(temps > 0)


def test_apply_temperature_bounds() -> None:
    logits = np.array([[2.0, -2.0, 0.0]])
    temps = np.ones(3)
    probs = apply_temperature(logits, temps)
    assert probs.shape == (1, 3)
    assert np.all(probs >= 0) and np.all(probs <= 1)


def test_brier_perfect() -> None:
    y = np.array([0.0, 1.0, 1.0, 0.0])
    p = np.array([0.0, 1.0, 1.0, 0.0])
    assert brier_score(y, p) == 0.0


def test_metrics_endpoint(client: TestClient) -> None:
    response = client.get("/metrics")
    assert response.status_code == 200
    body = response.json()
    assert "macro_auroc" in body
    assert "labels" in body
    assert "calibration" in body
