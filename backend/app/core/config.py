from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_path: Path = BACKEND_ROOT / "artifacts" / "model.pt"
    scaler_path: Path = BACKEND_ROOT / "artifacts" / "scaler.joblib"
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    api_title: str = "Clinisight ADE Predictor"
    api_version: str = "0.1.0"


settings = Settings()
