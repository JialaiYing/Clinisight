"""Captum Integrated Gradients attributions for each ADE outcome."""

from __future__ import annotations

from typing import Any

import numpy as np
import torch
from captum.attr import IntegratedGradients
from torch import nn

from ml.drugs import DRUG_CATALOG, drug_label
from ml.generate_data import FEATURE_COLS, OUTCOME_COLS

# Human-readable labels for UI (keys match FEATURE_COLS).
FEATURE_LABELS: dict[str, str] = {
    "age": "Age",
    "sex": "Sex (male)",
    "bmi": "BMI",
    "heart_rate": "Heart rate",
    "sbp": "Systolic BP",
    "dbp": "Diastolic BP",
    "temperature": "Temperature",
    "creatinine": "Creatinine",
    "egfr": "eGFR",
    "potassium": "Potassium",
    "sodium": "Sodium",
    "ast": "AST",
    "alt": "ALT",
    "hemoglobin": "Hemoglobin",
    "wbc": "WBC",
    "platelets": "Platelets",
    "glucose": "Glucose",
    "diabetes": "Diabetes",
    "hypertension": "Hypertension",
    "ckd": "CKD",
    "liver_disease": "Liver disease",
    "heart_failure": "Heart failure",
    "num_concurrent_meds": "Concurrent meds",
    **{f"drug_{d}": drug_label(d) for d in DRUG_CATALOG},
}

TOP_K = 4
N_STEPS = 32
MIN_ABS = 1e-4


def attribute_scaled_input(
    model: nn.Module,
    scaled_x: np.ndarray,
    *,
    top_k: int = TOP_K,
    n_steps: int = N_STEPS,
) -> dict[str, list[dict[str, Any]]]:
    """
    Per-outcome Integrated Gradients on a single scaled feature row.

    Baseline is zeros in scaled space (≈ training-set means after StandardScaler).
    Positive contribution → feature pushed the ADE logit (risk) up.
    """
    if scaled_x.ndim == 1:
        scaled_x = scaled_x.reshape(1, -1)

    model.eval()
    device = next(model.parameters()).device
    x = torch.from_numpy(scaled_x.astype(np.float32)).to(device)
    baseline = torch.zeros_like(x)

    ig = IntegratedGradients(model)
    out: dict[str, list[dict[str, Any]]] = {}

    for target_idx, outcome in enumerate(OUTCOME_COLS):
        attr = ig.attribute(x, baselines=baseline, target=target_idx, n_steps=n_steps)
        scores = attr.detach().cpu().numpy()[0]

        ranked = sorted(
            zip(FEATURE_COLS, scores.tolist(), strict=True),
            key=lambda pair: abs(pair[1]),
            reverse=True,
        )
        items: list[dict[str, Any]] = []
        for feat, score in ranked[:top_k]:
            if abs(score) < MIN_ABS:
                continue
            items.append(
                {
                    "feature": FEATURE_LABELS.get(feat, feat),
                    "feature_key": feat,
                    "contribution": round(float(score), 4),
                }
            )
        out[outcome] = items

    return out
