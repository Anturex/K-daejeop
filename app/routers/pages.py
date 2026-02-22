from __future__ import annotations

import time

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.core.config import get_settings

router = APIRouter(tags=["pages"])

templates = Jinja2Templates(directory="app/templates")

# 서버 시작 시점의 타임스탬프 → 정적 파일 캐시 버스터
_CACHE_BUSTER = str(int(time.time()))


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
            "supabase_url": settings.supabase_url,
            "supabase_anon_key": settings.supabase_anon_key,
            "v": _CACHE_BUSTER,
        },
    )
