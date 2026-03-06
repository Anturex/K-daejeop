"""인증 (JWT 검증, /api/auth/me) 테스트."""

from __future__ import annotations

import time

import jwt
import pytest


def _make_token(secret: str, payload_overrides: dict | None = None) -> str:
    """테스트용 Supabase JWT를 생성합니다."""
    now = int(time.time())
    payload = {
        "sub": "user-uuid-1234",
        "email": "test@example.com",
        "aud": "authenticated",
        "iat": now,
        "exp": now + 3600,
        "user_metadata": {
            "full_name": "Test User",
            "avatar_url": "https://example.com/avatar.png",
            "picture": "https://example.com/pic.png",
        },
    }
    if payload_overrides:
        payload.update(payload_overrides)
    return jwt.encode(payload, secret, algorithm="HS256")


# ===== verify_supabase_token 단위 테스트 =====


class TestVerifySupabaseToken:
    """verify_supabase_token 함수 테스트."""

    def test_valid_token_returns_payload(self, settings):
        """유효한 토큰은 payload를 반환합니다."""
        from app.core.auth import verify_supabase_token

        token = _make_token(settings.supabase_jwt_secret)
        payload = verify_supabase_token(token)
        assert payload["sub"] == "user-uuid-1234"
        assert payload["email"] == "test@example.com"

    def test_expired_token_raises_401(self, settings):
        """만료된 토큰은 401을 반환합니다."""
        from fastapi import HTTPException

        from app.core.auth import verify_supabase_token

        token = _make_token(
            settings.supabase_jwt_secret,
            {"exp": int(time.time()) - 100},
        )
        with pytest.raises(HTTPException) as exc_info:
            verify_supabase_token(token)
        assert exc_info.value.status_code == 401
        assert "expired" in exc_info.value.detail.lower()

    def test_invalid_token_raises_401(self, settings):
        """잘못된 토큰은 401을 반환합니다."""
        from fastapi import HTTPException

        from app.core.auth import verify_supabase_token

        with pytest.raises(HTTPException) as exc_info:
            verify_supabase_token("not.a.valid.token")
        assert exc_info.value.status_code == 401

    def test_wrong_secret_raises_401(self, settings):
        """잘못된 시크릿으로 서명된 토큰은 401을 반환합니다."""
        from fastapi import HTTPException

        from app.core.auth import verify_supabase_token

        token = _make_token("wrong_secret_key_that_is_long_enough!")
        with pytest.raises(HTTPException) as exc_info:
            verify_supabase_token(token)
        assert exc_info.value.status_code == 401

    def test_wrong_audience_raises_401(self, settings):
        """잘못된 audience 클레임은 401을 반환합니다."""
        from fastapi import HTTPException

        from app.core.auth import verify_supabase_token

        token = _make_token(
            settings.supabase_jwt_secret,
            {"aud": "wrong_audience"},
        )
        with pytest.raises(HTTPException) as exc_info:
            verify_supabase_token(token)
        assert exc_info.value.status_code == 401

    def test_missing_jwt_secret_raises_500(self):
        """SUPABASE_JWT_SECRET이 비어있으면 500을 반환합니다."""
        import os
        from unittest.mock import patch

        from fastapi import HTTPException

        from app.core.auth import verify_supabase_token
        from app.core.config import get_settings

        get_settings.cache_clear()
        with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": ""}):
            get_settings.cache_clear()
            with pytest.raises(HTTPException) as exc_info:
                verify_supabase_token("any.token.here")
            assert exc_info.value.status_code == 500


# ===== /api/auth/me 통합 테스트 =====


class TestAuthMeEndpoint:
    """GET /api/auth/me 엔드포인트 테스트."""

    @pytest.mark.asyncio
    async def test_me_returns_user_info(self, client, settings):
        """유효한 토큰으로 유저 정보를 반환합니다."""
        token = _make_token(settings.supabase_jwt_secret)
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "user-uuid-1234"
        assert data["email"] == "test@example.com"
        assert data["name"] == "Test User"
        assert "avatar.png" in data["avatar_url"]

    @pytest.mark.asyncio
    async def test_me_without_token_returns_401(self, client):
        """토큰 없이 호출하면 401을 반환합니다."""
        response = await client.get("/api/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_me_with_invalid_token_returns_401(self, client):
        """유효하지 않은 토큰은 401을 반환합니다."""
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_me_with_expired_token_returns_401(self, client, settings):
        """만료된 토큰은 401을 반환합니다."""
        token = _make_token(
            settings.supabase_jwt_secret,
            {"exp": int(time.time()) - 100},
        )
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401


# ===== React SPA 서빙 테스트 =====


class TestReactSPAServing:
    """React SPA가 올바르게 서빙되는지 테스트.

    Jinja2 SSR → React SPA 전환 후 인증 관련 UI는 클라이언트에서 렌더링됩니다.
    서버는 React 마운트 포인트(#root)가 포함된 HTML 셸을 서빙합니다.
    """

    @pytest.mark.asyncio
    async def test_spa_has_react_root(self, client):
        """HTML에 React 마운트 포인트(#root)가 존재합니다."""
        response = await client.get("/")
        assert response.status_code == 200
        assert 'id="root"' in response.text

    @pytest.mark.asyncio
    async def test_spa_loads_js_bundle(self, client):
        """HTML에 JS 번들이 로드됩니다."""
        body = (await client.get("/")).text
        assert "/assets/" in body
        assert ".js" in body

    @pytest.mark.asyncio
    async def test_spa_has_html_lang(self, client):
        """HTML에 lang 속성이 설정됩니다."""
        body = (await client.get("/")).text
        assert 'lang="ko"' in body

    @pytest.mark.asyncio
    async def test_spa_has_viewport_meta(self, client):
        """HTML에 viewport 메타 태그가 포함됩니다."""
        body = (await client.get("/")).text
        assert "viewport" in body
