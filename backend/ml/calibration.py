"""Post-hoc probability calibration (temperature scaling per ADE label)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import torch
import torch.nn.functional as F
from torch import nn

from ml.generate_data import OUTCOME_COLS

CALIBRATOR_PATH = Path(__file__).resolve().parents[1] / "artifacts" / "calibrator.joblib"


def fit_temperatures(
    logits: np.ndarray,
    labels: np.ndarray,
    *,
    max_iter: int = 100,
) -> np.ndarray:
    """
    Fit one temperature T_i > 0 per label minimizing BCE on val logits.

    Calibrated probability: sigmoid(logit / T).
    """
    assert logits.shape == labels.shape
    n_labels = logits.shape[1]
    temperatures = np.ones(n_labels, dtype=np.float64)

    for i in range(n_labels):
        logit_i = torch.tensor(logits[:, i], dtype=torch.float64)
        label_i = torch.tensor(labels[:, i], dtype=torch.float64)
        log_t = nn.Parameter(torch.zeros(1, dtype=torch.float64))  # T = exp(log_t) > 0

        optimizer = torch.optim.LBFGS([log_t], lr=0.5, max_iter=max_iter, line_search_fn="strong_wolfe")

        def closure() -> torch.Tensor:
            optimizer.zero_grad()
            t = torch.exp(log_t).clamp(min=1e-3, max=100.0)
            loss = F.binary_cross_entropy_with_logits(logit_i / t, label_i)
            loss.backward()
            return loss

        optimizer.step(closure)
        temperatures[i] = float(torch.exp(log_t).clamp(min=1e-3, max=100.0).item())

    return temperatures


def apply_temperature(logits: np.ndarray, temperatures: np.ndarray) -> np.ndarray:
    """sigmoid(logits / T) with broadcasting temperatures shape (n_labels,)."""
    scaled = logits / temperatures.reshape(1, -1)
    return 1.0 / (1.0 + np.exp(-np.clip(scaled, -50, 50)))


def brier_score(y_true: np.ndarray, y_prob: np.ndarray) -> float:
    return float(np.mean((y_prob - y_true) ** 2))


def expected_calibration_error(
    y_true: np.ndarray, y_prob: np.ndarray, *, n_bins: int = 10
) -> float:
    """Binary ECE over equal-width probability bins."""
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n = len(y_true)
    if n == 0:
        return float("nan")
    for i in range(n_bins):
        lo, hi = bins[i], bins[i + 1]
        if i == n_bins - 1:
            mask = (y_prob >= lo) & (y_prob <= hi)
        else:
            mask = (y_prob >= lo) & (y_prob < hi)
        if not np.any(mask):
            continue
        conf = float(y_prob[mask].mean())
        acc = float(y_true[mask].mean())
        ece += (mask.sum() / n) * abs(conf - acc)
    return float(ece)


def save_calibrator(
    temperatures: np.ndarray,
    path: Path | str = CALIBRATOR_PATH,
    *,
    method: str = "temperature_scaling",
    fitted_on: str = "validation",
) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload: dict[str, Any] = {
        "method": method,
        "fitted_on": fitted_on,
        "temperatures": {
            name: float(temperatures[i]) for i, name in enumerate(OUTCOME_COLS)
        },
        "temperature_vector": temperatures.astype(np.float64).tolist(),
    }
    joblib.dump(payload, path)


def load_calibrator(path: Path | str = CALIBRATOR_PATH) -> dict[str, Any] | None:
    path = Path(path)
    if not path.exists():
        return None
    return joblib.load(path)


def temperatures_from_calibrator(calibrator: dict[str, Any]) -> np.ndarray:
    vec = calibrator.get("temperature_vector")
    if vec is not None:
        return np.asarray(vec, dtype=np.float64)
    temps = calibrator["temperatures"]
    return np.array([float(temps[name]) for name in OUTCOME_COLS], dtype=np.float64)
