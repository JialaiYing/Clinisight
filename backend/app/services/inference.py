"""Model + scaler lifecycle for ADE inference."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
from sklearn.preprocessing import StandardScaler

from app.schemas.patient import MedicationClass, PatientInput, Sex
from ml.generate_data import FEATURE_COLS, MED_CLASSES, OUTCOME_COLS, ckd_epi_2021_egfr
from ml.model import ADEPredictor
from ml.preprocess import load_scaler, transform


class InferenceService:
    def __init__(self) -> None:
        self.model: ADEPredictor | None = None
        self.scaler: StandardScaler | None = None
        self.device: torch.device = torch.device("cpu")
        self.loaded: bool = False

    def load(self, model_path: Path, scaler_path: Path) -> None:
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
        model = ADEPredictor().to(self.device)
        model.load_state_dict(ckpt["model_state_dict"])
        model.eval()
        self.model = model
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
            "num_concurrent_meds": float(patient.num_concurrent_meds),
            "on_nsaid": float(patient.on_nsaid),
            "on_ace_inhibitor": float(patient.on_ace_inhibitor),
            "on_anticoagulant": float(patient.on_anticoagulant),
            "on_insulin": float(patient.on_insulin),
        }

        for cls in MED_CLASSES:
            values[f"med_class_{cls}"] = (
                1.0 if patient.medication_class == MedicationClass(cls) else 0.0
            )

        vector = np.array([[values[c] for c in FEATURE_COLS]], dtype=np.float64)
        return vector, egfr

    @torch.no_grad()
    def predict(self, patient: PatientInput) -> tuple[dict[str, float], float]:
        if not self.loaded or self.model is None or self.scaler is None:
            raise RuntimeError("InferenceService not loaded")

        raw, egfr = self.patient_to_vector(patient)
        scaled = transform(self.scaler, raw)
        x = torch.from_numpy(scaled).to(self.device)
        logits = self.model(x)
        probs = torch.sigmoid(logits).cpu().numpy()[0]

        risks = {
            name: float(round(float(probs[i]), 4)) for i, name in enumerate(OUTCOME_COLS)
        }
        return risks, egfr


inference_service = InferenceService()
