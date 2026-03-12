from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.routers import auth, health, pages, places


class HealthCheckFilter(logging.Filter):
    """Filter out /api/health requests from access logs."""

    def filter(self, record: logging.LogRecord) -> bool:
        return "/api/health" not in record.getMessage()

_DIST_DIR = Path(__file__).resolve().parent / "static" / "dist"


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name)

    # Suppress /api/health from access logs (keep-alive polling noise)
    logging.getLogger("uvicorn.access").addFilter(HealthCheckFilter())

    # API 라우터 (SPA 라우터보다 먼저 등록)
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(places.router)

    # Vite 빌드 결과 정적 파일 (JS/CSS chunks)
    dist_assets = _DIST_DIR / "assets"
    if dist_assets.exists():
        app.mount("/assets", StaticFiles(directory=str(dist_assets)), name="assets")

    # 기존 정적 파일 (아이콘 등)
    app.mount("/static", StaticFiles(directory="app/static"), name="static")

    # SPA 라우터 (catch-all, 가장 마지막)
    app.include_router(pages.router)

    return app


app = create_app()
