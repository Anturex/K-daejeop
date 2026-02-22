"""Supabase 실제 연결 테스트.

.env.development (또는 .env)에 설정된 실제 Supabase 값으로 연결을 확인합니다.
conftest.py의 mock 환경변수를 임시 제거한 뒤 .env 파일에서 직접 로딩합니다.

실행:
    uv run pytest tests/test_supabase_connection.py -v -s
"""

from __future__ import annotations

import os

import httpx
import pytest

from app.core.config import Settings, _resolve_env_file

# conftest.py mock 값과 충돌하는 환경변수 목록
_SUPABASE_ENV_KEYS = ("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_JWT_SECRET")


def _load_real_settings() -> Settings:
    """conftest.py mock을 우회하고 실제 .env 파일에서 Settings를 로딩합니다."""
    # 1) conftest가 설정한 mock 환경변수를 임시 저장 후 제거
    saved = {}
    for key in _SUPABASE_ENV_KEYS:
        if key in os.environ:
            saved[key] = os.environ.pop(key)

    try:
        env_file = _resolve_env_file("development")
        if env_file:
            return Settings(_env_file=env_file)
        return Settings()
    finally:
        # 2) 원래 환경변수 복원 (다른 테스트에 영향 주지 않도록)
        os.environ.update(saved)


@pytest.fixture(scope="module")
def real_settings():
    return _load_real_settings()


class TestSupabaseConnection:
    """실제 Supabase 연결 확인 테스트."""

    def test_supabase_env_vars_loaded(self, real_settings):
        """SUPABASE 환경변수가 비어있지 않은지 확인합니다."""
        assert real_settings.supabase_url, (
            "SUPABASE_URL이 비어있습니다. .env.development에 값을 설정하세요."
        )
        assert real_settings.supabase_anon_key, (
            "SUPABASE_ANON_KEY가 비어있습니다. .env.development에 값을 설정하세요."
        )
        assert real_settings.supabase_jwt_secret, (
            "SUPABASE_JWT_SECRET이 비어있습니다. .env.development에 값을 설정하세요."
        )
        print(f"\n  ✅ SUPABASE_URL = {real_settings.supabase_url}")
        print(f"  ✅ SUPABASE_ANON_KEY = {real_settings.supabase_anon_key[:20]}...")
        print(f"  ✅ SUPABASE_JWT_SECRET = {'*' * 10} (설정됨)")

    def test_supabase_url_format(self, real_settings):
        """SUPABASE_URL이 올바른 형식인지 확인합니다."""
        url = real_settings.supabase_url
        assert url.startswith("https://"), f"SUPABASE_URL은 https://로 시작해야 합니다: {url}"
        assert ".supabase.co" in url, f"SUPABASE_URL에 .supabase.co가 포함되어야 합니다: {url}"

    def test_supabase_anon_key_is_jwt(self, real_settings):
        """SUPABASE_ANON_KEY가 JWT 형식인지 확인합니다."""
        parts = real_settings.supabase_anon_key.split(".")
        assert len(parts) == 3, "SUPABASE_ANON_KEY는 JWT 형식(xxx.yyy.zzz)이어야 합니다"

    @pytest.mark.asyncio
    async def test_supabase_rest_reachable(self, real_settings):
        """Supabase REST API에 접근 가능한지 확인합니다."""
        url = f"{real_settings.supabase_url}/rest/v1/"

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                url,
                headers={
                    "apikey": real_settings.supabase_anon_key,
                    "Authorization": f"Bearer {real_settings.supabase_anon_key}",
                },
            )
        assert response.status_code in (200, 404), (
            f"Supabase REST API 응답 실패: {response.status_code} - {response.text[:200]}"
        )
        print(f"\n  ✅ REST API 응답: {response.status_code}")

    @pytest.mark.asyncio
    async def test_supabase_auth_reachable(self, real_settings):
        """Supabase Auth API에 접근 가능한지 확인합니다."""
        url = f"{real_settings.supabase_url}/auth/v1/settings"

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                url,
                headers={
                    "apikey": real_settings.supabase_anon_key,
                },
            )
        assert response.status_code == 200, (
            f"Supabase Auth API 응답 실패: {response.status_code} - {response.text[:200]}"
        )
        data = response.json()
        assert "external" in data, "Auth settings에 'external' 필드가 없습니다"
        print(f"\n  ✅ Auth API 응답: {response.status_code}")

    @pytest.mark.asyncio
    async def test_google_oauth_enabled(self, real_settings):
        """Supabase에서 Google OAuth가 활성화되어 있는지 확인합니다."""
        url = f"{real_settings.supabase_url}/auth/v1/settings"

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                url,
                headers={
                    "apikey": real_settings.supabase_anon_key,
                },
            )
        assert response.status_code == 200
        data = response.json()
        external = data.get("external", {})
        assert external.get("google") is True, (
            "Google OAuth가 Supabase에서 활성화되지 않았습니다.\n"
            "→ 대시보드 → Authentication → Providers → Google 에서 활성화하세요."
        )
        print("\n  ✅ Google OAuth: 활성화됨")
