from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, metrics, predict
from app.core.config import _LAN_ORIGIN_RE, settings
from app.services.inference import inference_service


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Warm model + scaler (+ calibrator if present) once so requests don't pay load cost.
    inference_service.load(
        settings.model_path,
        settings.scaler_path,
        settings.calibrator_path,
    )
    yield


app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    # Regex covers the frontend loaded from a private-LAN IP (e.g. a phone on
    # the same Wi-Fi hitting http://10.0.0.4:3000) so the static allow-list
    # above doesn't need to be updated whenever the machine's IP changes.
    allow_origin_regex=_LAN_ORIGIN_RE.pattern,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(predict.router)
app.include_router(metrics.router)
