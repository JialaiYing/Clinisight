"""StandardScaler fit on train features; shared by train + inference."""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

from ml.generate_data import FEATURE_COLS, OUTCOME_COLS

SCALER_PATH = Path(__file__).resolve().parents[1] / "artifacts" / "scaler.joblib"


def load_split(csv_path: Path | str) -> tuple[np.ndarray, np.ndarray]:
    df = pd.read_csv(csv_path)
    x = df[FEATURE_COLS].to_numpy(dtype=np.float64)
    y = df[OUTCOME_COLS].to_numpy(dtype=np.float64)
    return x, y


def fit_scaler(x_train: np.ndarray) -> StandardScaler:
    scaler = StandardScaler()
    scaler.fit(x_train)
    return scaler


def transform(scaler: StandardScaler, x: np.ndarray) -> np.ndarray:
    return scaler.transform(x).astype(np.float32)


def save_scaler(scaler: StandardScaler, path: Path | str = SCALER_PATH) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(scaler, path)


def load_scaler(path: Path | str = SCALER_PATH) -> StandardScaler:
    return joblib.load(path)
