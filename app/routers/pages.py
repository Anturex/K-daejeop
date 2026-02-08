from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.core.config import get_settings

router = APIRouter(tags=["pages"])

templates = Jinja2Templates(directory="app/templates")


@router.get("/", response_class=HTMLResponse)
async def index(request: Request):
    settings = get_settings()
    if not settings.kakao_js_key:
        raise HTTPException(status_code=500, detail="KAKAO_JS_KEY is not set")
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "kakao_js_key": settings.kakao_js_key,
            "kakao_sdk_url": settings.kakao_sdk_url,
        },
    )
