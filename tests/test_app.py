from __future__ import annotations

import pytest
from fastapi import FastAPI


class TestCreateApp:
    """create_app 팩토리 함수 테스트."""

    def test_returns_fastapi_instance(self, app):
        assert isinstance(app, FastAPI)

    def test_app_title_matches_settings(self, app, settings):
        assert app.title == settings.app_name

    def test_health_route_registered(self, app):
        paths = [r.path for r in app.routes]
        assert "/api/health" in paths

    def test_index_route_registered(self, app):
        paths = [r.path for r in app.routes]
        assert "/" in paths

    def test_places_route_registered(self, app):
        paths = [r.path for r in app.routes]
        assert "/api/places" in paths

    def test_auth_route_registered(self, app):
        paths = [r.path for r in app.routes]
        assert "/api/auth/me" in paths

    def test_static_files_mounted(self, app):
        mount_names = [r.name for r in app.routes if hasattr(r, "name")]
        assert "static" in mount_names


class TestStaticFiles:
    """정적 파일 서빙 테스트 (Vite 빌드 결과)."""

    @pytest.mark.asyncio
    async def test_vite_js_bundle_served(self, client):
        """Vite 빌드된 JS 번들이 /assets/ 경로로 서빙됩니다."""
        # index.html에서 JS 번들 경로를 추출
        response = await client.get("/")
        body = response.text
        assert "/assets/" in body
        assert ".js" in body

    @pytest.mark.asyncio
    async def test_vite_css_bundle_served(self, client):
        """Vite 빌드된 CSS 번들이 /assets/ 경로로 서빙됩니다."""
        response = await client.get("/")
        body = response.text
        assert ".css" in body

    @pytest.mark.asyncio
    async def test_nonexistent_static_returns_404(self, client):
        response = await client.get("/static/does-not-exist.js")
        assert response.status_code == 404
