"""Model + scaler + optional temperature calibrator for ADE inference."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
from sklearn.preprocessing import StandardScaler

from app.schemas.patient import PatientInput, Sex
from app.services.attribution import attribute_scaled_input
from ml.calibration import (
    apply_temperature,
    load_calibrator,
    temperatures_from_calibrator,
)
from ml.drugs import medication_feature_vector
from ml.generate_data import FEATURE_COLS, OUTCOME_COLS, ckd_epi_2021_egfr
from ml.model import ADEPredictor
from ml.preprocess import load_scaler, transform


def prediction_confidence(risks: dict[str, float]) -> str:
    """Rough label: scores farther from 0.5 count as more decisive."""
    if not risks:
        return "low"
    mean_dist = sum(abs(p - 0.5) for p in risks.values()) / len(risks)
    if mean_dist >= 0.25:
        return "high"
    if mean_dist >= 0.15:
        return "moderate"
    return "low"


class InferenceService:
    def __init__(self) -> None:
        self.model: ADEPredictor | None = None
        self.scaler: StandardScaler | None = None
        self.temperatures: np.ndarray | None = None
        self.calibration_applied: bool = False
        self.device: torch.device = torch.device("cpu")
        self.loaded: bool = False

    def load(
        self,
        model_path: Path,
        scaler_path: Path,
        calibrator_path: Path | None = None,
    ) -> None:
        if not model_path.exists():
            raise FileNotFoundError(
                f"Model not found at {model_path}. Run: python -m ml.train"
            )
        if not scaler_path.exists():
            raise FileNotFoundError(
                f"Scaler not found at {scaler_path}. Run: python -m ml.train"
            )

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.scaler = load_scaler(scaler_path)

        ckpt = torch.load(model_path, map_location=self.device, weights_only=False)
        ckpt_dim = ckpt.get("input_dim")
        if ckpt_dim is not None and int(ckpt_dim) != len(FEATURE_COLS):
            raise RuntimeError(
                f"Model input_dim={ckpt_dim} does not match FEATURE_COLS "
                f"({len(FEATURE_COLS)}). Re-run: python -m ml.generate_data && "
                "python -m ml.train && python -m ml.evaluate"
            )
        model = ADEPredictor().to(self.device)
        model.load_state_dict(ckpt["model_state_dict"])
        model.eval()
        self.model = model

        self.temperatures = None
        self.calibration_applied = False
        if calibrator_path is not None:
            calibrator = load_calibrator(calibrator_path)
            if calibrator is not None:
                self.temperatures = temperatures_from_calibrator(calibrator)
                self.calibration_applied = True

        self.loaded = True

    def patient_to_vector(self, patient: PatientInput) -> tuple[np.ndarray, float]:
        sex_val = 0.0 if patient.sex == Sex.female else 1.0
        age = float(patient.age)
        creatinine = float(patient.creatinine)

        egfr = float(
            ckd_epi_2021_egfr(
                np.array([creatinine]),
                np.array([age]),
                np.array([sex_val]),
            )[0]
        )
        egfr = float(np.clip(egfr, 5.0, 140.0))

        curated_count = float(len(patient.medications))
        num_concurrent = float(max(patient.num_concurrent_meds, int(curated_count)))

        values: dict[str, float] = {
            "age": age,
            "sex": sex_val,
            "bmi": float(patient.bmi),
            "heart_rate": float(patient.heart_rate),
            "sbp": float(patient.sbp),
            "dbp": float(patient.dbp),
            "temperature": float(patient.temperature),
            "creatinine": creatinine,
            "egfr": egfr,
            "potassium": float(patient.potassium),
            "sodium": float(patient.sodium),
            "ast": float(patient.ast),
            "alt": float(patient.alt),
            "hemoglobin": float(patient.hemoglobin),
            "wbc": float(patient.wbc),
            "platelets": float(patient.platelets),
            "glucose": float(patient.glucose),
            "diabetes": float(patient.diabetes),
            "hypertension": float(patient.hypertension),
            "ckd": float(patient.ckd),
            "liver_disease": float(patient.liver_disease),
            "heart_failure": float(patient.heart_failure),
            "num_concurrent_meds": num_concurrent,
            **medication_feature_vector(patient.medications),
        }

        vector = np.array([[values[c] for c in FEATURE_COLS]], dtype=np.float64)
        return vector, egfr

    def _scaled_features(self, patient: PatientInput) -> tuple[np.ndarray, float]:
        if not self.loaded or self.scaler is None:
            raise RuntimeError("InferenceService not loaded")
        raw, egfr = self.patient_to_vector(patient)
        return transform(self.scaler, raw), egfr

    @torch.no_grad()
    def predict(self, patient: PatientInput) -> tuple[dict[str, float], float]:
        if not self.loaded or self.model is None:
            raise RuntimeError("InferenceService not loaded")

        scaled, egfr = self._scaled_features(patient)
        x = torch.from_numpy(scaled).to(self.device)
        logits = self.model(x).cpu().numpy()

        if self.temperatures is not None:
            probs = apply_temperature(logits, self.temperatures)[0]
        else:
            probs = (1.0 / (1.0 + np.exp(-np.clip(logits, -50, 50))))[0]

        risks = {
            name: float(round(float(probs[i]), 4)) for i, name in enumerate(OUTCOME_COLS)
        }
        return risks, egfr

    def attribute(self, patient: PatientInput) -> dict[str, list[dict]]:
        """Captum Integrated Gradients per ADE (requires grad; not under no_grad)."""
        if not self.loaded or self.model is None:
            raise RuntimeError("InferenceService not loaded")
        scaled, _ = self._scaled_features(patient)
        return attribute_scaled_input(self.model, scaled)


inference_service = InferenceService()
