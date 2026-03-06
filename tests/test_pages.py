"""SPA (React) 서빙 테스트 — Vite 빌드 결과물 서빙을 검증합니다."""
from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_index_returns_html(client):
    """GET / 가 HTML을 반환합니다."""
    response = await client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    body = response.text
    assert "K-daejeop" in body


@pytest.mark.asyncio
async def test_index_has_root_div(client):
    """HTML에 React 마운트 포인트(#root)가 존재합니다."""
    response = await client.get("/")
    assert 'id="root"' in response.text


@pytest.mark.asyncio
async def test_index_has_pwa_manifest(client):
    """HTML에 PWA manifest 링크가 포함됩니다."""
    response = await client.get("/")
    assert 'rel="manifest"' in response.text
    assert "manifest.json" in response.text


@pytest.mark.asyncio
async def test_index_has_apple_meta_tags(client):
    """HTML에 iOS PWA 메타 태그가 포함됩니다."""
    body = (await client.get("/")).text
    assert 'name="apple-mobile-web-app-capable"' in body
    assert 'content="yes"' in body
    assert 'name="apple-mobile-web-app-status-bar-style"' in body
    assert 'rel="apple-touch-icon"' in body


@pytest.mark.asyncio
async def test_index_has_theme_color(client):
    """HTML에 theme-color 메타 태그가 포함됩니다."""
    body = (await client.get("/")).text
    assert 'name="theme-color"' in body


@pytest.mark.asyncio
async def test_index_has_viewport_fit_cover(client):
    """viewport 메타에 viewport-fit=cover가 포함됩니다."""
    body = (await client.get("/")).text
    assert "viewport-fit=cover" in body


@pytest.mark.asyncio
async def test_index_loads_js_bundle(client):
    """HTML에 JS 번들이 로드됩니다."""
    body = (await client.get("/")).text
    assert "/assets/" in body
    assert ".js" in body


@pytest.mark.asyncio
async def test_index_loads_css_bundle(client):
    """HTML에 CSS 번들이 로드됩니다."""
    body = (await client.get("/")).text
    assert ".css" in body


@pytest.mark.asyncio
async def test_spa_fallback_returns_html(client):
    """존재하지 않는 경로에서 SPA fallback으로 index.html을 반환합니다."""
    response = await client.get("/some/random/path")
    assert response.status_code == 200
    assert 'id="root"' in response.text
