from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, metrics, predict
from app.core.config import _CORS_ORIGIN_RE, settings
from app.services.inference import inference_service


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Load once at startup so the first request isn't paying cold-load cost.
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
    allow_origin_regex=_CORS_ORIGIN_RE.pattern,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(predict.router)
app.include_router(metrics.router)
