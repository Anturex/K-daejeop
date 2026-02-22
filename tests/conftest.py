from __future__ import annotations

import os
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

# 테스트 환경에서는 env 파일 없이 기본값 사용
os.environ.setdefault("KAKAO_JS_KEY", "test_js_key")
os.environ.setdefault("KAKAO_REST_KEY", "test_rest_key")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test_anon_key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test_jwt_secret_at_least_32chars_long!")

from app.core.config import get_settings  # noqa: E402


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    """매 테스트마다 Settings 캐시를 초기화합니다."""
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture()
def settings():
    return get_settings()


@pytest.fixture()
async def app():
    """FastAPI 앱 인스턴스."""
    from app.main import create_app

    application = create_app()
    yield application
    application.dependency_overrides.clear()


@pytest.fixture()
async def client(app):
    """FastAPI TestClient (async, httpx)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
