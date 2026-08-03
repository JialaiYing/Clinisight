from __future__ import annotations

import re
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]

# Localhost, private LAN IPs, and *.vercel.app (so preview URLs work without
# updating the static list every time).
_CORS_ORIGIN_RE = re.compile(
    r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|"
    r"192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$"
    r"|^https://[\w-]+\.vercel\.app$"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    model_path: Path = BACKEND_ROOT / "artifacts" / "model.pt"
    scaler_path: Path = BACKEND_ROOT / "artifacts" / "scaler.joblib"
    calibrator_path: Path = BACKEND_ROOT / "artifacts" / "calibrator.joblib"
    metrics_path: Path = BACKEND_ROOT / "artifacts" / "metrics.json"
    # Optional JSON override, e.g. CORS_ORIGINS=["https://example.com"]
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    api_title: str = "Clinisight ADE Predictor"
    api_version: str = "0.1.0"


settings = Settings()
