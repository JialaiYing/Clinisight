from __future__ import annotations

import re
from pathlib import Path

from pydantic_settings import BaseSettings

BACKEND_ROOT = Path(__file__).resolve().parents[2]

# Matches http(s)://<private-LAN-IP>[:port] so the demo also works from a
# phone/laptop on the same Wi-Fi as the host machine, not just localhost.
_LAN_ORIGIN_RE = re.compile(
    r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|"
    r"192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$"
)


class Settings(BaseSettings):
    model_path: Path = BACKEND_ROOT / "artifacts" / "model.pt"
    scaler_path: Path = BACKEND_ROOT / "artifacts" / "scaler.joblib"
    calibrator_path: Path = BACKEND_ROOT / "artifacts" / "calibrator.joblib"
    metrics_path: Path = BACKEND_ROOT / "artifacts" / "metrics.json"
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    api_title: str = "Clinisight ADE Predictor"
    api_version: str = "0.1.0"


settings = Settings()
