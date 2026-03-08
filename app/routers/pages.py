from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse, HTMLResponse

router = APIRouter(tags=["pages"])

# Vite 빌드 결과 경로
_DIST_DIR = Path(__file__).resolve().parent.parent / "static" / "dist"


_NO_CACHE = {"Cache-Control": "no-cache, no-store, must-revalidate"}


@router.get("/", response_class=HTMLResponse)
async def index():
    """SPA 진입점: Vite 빌드 index.html 서빙"""
    index_html = _DIST_DIR / "index.html"
    if not index_html.exists():
        return HTMLResponse(
            content="<h1>Frontend not built</h1>"
            "<p>Run <code>cd frontend && npm run build</code></p>",
            status_code=503,
        )
    return FileResponse(index_html, media_type="text/html", headers=_NO_CACHE)


@router.get("/{path:path}")
async def serve_dist_or_spa(path: str):
    """dist 루트의 정적 파일 서빙 (manifest.json, icons 등).
    파일이 없으면 SPA fallback으로 index.html 반환."""
    file = _DIST_DIR / path
    # 디렉토리 탈출 방지 + 파일 존재 확인
    if file.resolve().is_relative_to(_DIST_DIR.resolve()) and file.is_file():
        return FileResponse(file)

    # SPA fallback
    index_html = _DIST_DIR / "index.html"
    if index_html.exists():
        return FileResponse(index_html, media_type="text/html", headers=_NO_CACHE)

    return HTMLResponse(content="Not found", status_code=404)
