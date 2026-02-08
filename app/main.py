from __future__ import annotations

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.routers import health, pages, places


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name)
    app.mount("/static", StaticFiles(directory="app/static"), name="static")

    app.include_router(health.router)
    app.include_router(pages.router)
    app.include_router(places.router)

    return app


app = create_app()
