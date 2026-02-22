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


# ── 헬퍼: REST API 호출 ──

async def _rest_get(base: str, path: str, headers: dict) -> httpx.Response:
    async with httpx.AsyncClient(timeout=10) as client:
        return await client.get(f"{base}{path}", headers=headers)


async def _rest_post(base: str, path: str, headers: dict, json: dict) -> httpx.Response:
    h = {**headers, "Content-Type": "application/json", "Prefer": "return=minimal"}
    async with httpx.AsyncClient(timeout=10) as client:
        return await client.post(f"{base}{path}", headers=h, json=json)


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
        resp = await _rest_get(
            real_settings.supabase_url,
            "/rest/v1/",
            {
                "apikey": real_settings.supabase_anon_key,
                "Authorization": f"Bearer {real_settings.supabase_anon_key}",
            },
        )
        assert resp.status_code in (200, 404), (
            f"Supabase REST API 응답 실패: {resp.status_code} - {resp.text[:200]}"
        )
        print(f"\n  ✅ REST API 응답: {resp.status_code}")

    @pytest.mark.asyncio
    async def test_supabase_auth_reachable(self, real_settings):
        """Supabase Auth API에 접근 가능한지 확인합니다."""
        resp = await _rest_get(
            real_settings.supabase_url,
            "/auth/v1/settings",
            {"apikey": real_settings.supabase_anon_key},
        )
        assert resp.status_code == 200, (
            f"Supabase Auth API 응답 실패: {resp.status_code} - {resp.text[:200]}"
        )
        data = resp.json()
        assert "external" in data, "Auth settings에 'external' 필드가 없습니다"
        print(f"\n  ✅ Auth API 응답: {resp.status_code}")

    @pytest.mark.asyncio
    async def test_google_oauth_enabled(self, real_settings):
        """Supabase에서 Google OAuth가 활성화되어 있는지 확인합니다."""
        resp = await _rest_get(
            real_settings.supabase_url,
            "/auth/v1/settings",
            {"apikey": real_settings.supabase_anon_key},
        )
        assert resp.status_code == 200
        data = resp.json()
        external = data.get("external", {})
        assert external.get("google") is True, (
            "Google OAuth가 Supabase에서 활성화되지 않았습니다.\n"
            "→ 대시보드 → Authentication → Providers → Google 에서 활성화하세요."
        )
        print("\n  ✅ Google OAuth: 활성화됨")


class TestSupabaseTables:
    """실제 Supabase에 테이블·버킷이 생성되어 있는지 확인합니다.

    마이그레이션 SQL(supabase/migrations/001_reviews_and_profiles.sql)을
    Supabase SQL Editor에서 실행한 뒤 테스트하세요.
    테이블이 아직 없으면 해당 테스트는 SKIP 처리됩니다.
    """

    @pytest.fixture(autouse=True)
    def _setup(self, real_settings):
        self._headers = {
            "apikey": real_settings.supabase_anon_key,
            "Authorization": f"Bearer {real_settings.supabase_anon_key}",
        }
        self._base = real_settings.supabase_url

    # ── 헬퍼 ──

    async def _table_exists(self, table: str) -> bool:
        """테이블이 존재하면 True, 404면 False."""
        resp = await _rest_get(self._base, f"/rest/v1/{table}?select=*&limit=0", self._headers)
        return resp.status_code != 404

    def _skip_if_no_table(self, exists: bool, table: str):
        if not exists:
            pytest.skip(
                f"{table} 테이블 미생성. "
                "supabase/migrations/001_reviews_and_profiles.sql을 SQL Editor에서 실행하세요."
            )

    # ── reviews 테이블 ──

    @pytest.mark.asyncio
    async def test_reviews_table_exists(self):
        """reviews 테이블이 존재하고 조회가 가능합니다."""
        resp = await _rest_get(self._base, "/rest/v1/reviews?select=id&limit=0", self._headers)
        if resp.status_code == 404:
            pytest.skip("reviews 테이블 미생성 — 마이그레이션 SQL 실행 필요")
        assert resp.status_code == 200, (
            f"reviews 테이블 조회 실패 ({resp.status_code}): {resp.text[:300]}"
        )
        print("\n  ✅ reviews 테이블 존재 확인")

    @pytest.mark.asyncio
    async def test_reviews_table_columns(self):
        """reviews 테이블에 필수 컬럼이 모두 존재합니다."""
        if not await self._table_exists("reviews"):
            pytest.skip("reviews 테이블 미생성")
        expected_cols = (
            "id,user_id,place_id,place_name,place_address,place_category,"
            "place_x,place_y,rating,review_text,photo_url,visited_at,"
            "created_at,updated_at"
        )
        resp = await _rest_get(
            self._base, f"/rest/v1/reviews?select={expected_cols}&limit=0", self._headers
        )
        assert resp.status_code == 200, (
            f"reviews 컬럼 조회 실패 ({resp.status_code}). "
            f"누락된 컬럼이 있을 수 있습니다.\n  응답: {resp.text[:300]}"
        )
        print(f"\n  ✅ reviews 컬럼 확인 OK")

    # ── user_profiles 테이블 ──

    @pytest.mark.asyncio
    async def test_user_profiles_table_exists(self):
        """user_profiles 테이블이 존재하고 조회가 가능합니다."""
        resp = await _rest_get(
            self._base, "/rest/v1/user_profiles?select=user_id&limit=0", self._headers
        )
        if resp.status_code == 404:
            pytest.skip("user_profiles 테이블 미생성 — 마이그레이션 SQL 실행 필요")
        assert resp.status_code == 200, (
            f"user_profiles 테이블 조회 실패 ({resp.status_code}): {resp.text[:300]}"
        )
        print("\n  ✅ user_profiles 테이블 존재 확인")

    @pytest.mark.asyncio
    async def test_user_profiles_table_columns(self):
        """user_profiles 테이블에 필수 컬럼이 모두 존재합니다."""
        if not await self._table_exists("user_profiles"):
            pytest.skip("user_profiles 테이블 미생성")
        expected_cols = "user_id,tutorial_seen,created_at"
        resp = await _rest_get(
            self._base, f"/rest/v1/user_profiles?select={expected_cols}&limit=0", self._headers
        )
        assert resp.status_code == 200, (
            f"user_profiles 컬럼 조회 실패 ({resp.status_code}). "
            f"누락 컬럼 가능성.\n  응답: {resp.text[:300]}"
        )
        print("\n  ✅ user_profiles 컬럼 확인 OK")

    # ── Storage: review-photos 버킷 ──

    @pytest.mark.asyncio
    async def test_storage_bucket_exists(self):
        """review-photos 스토리지 버킷이 존재합니다."""
        # anon key로는 /storage/v1/bucket/ 관리 API 접근 불가하므로
        # public 버킷의 오브젝트 목록 조회 엔드포인트로 존재 여부를 확인합니다.
        headers = {**self._headers, "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{self._base}/storage/v1/object/list/review-photos",
                headers=headers,
                json={"prefix": "", "limit": 1},
            )
        assert resp.status_code == 200, (
            f"review-photos 버킷 조회 실패 ({resp.status_code}): {resp.text[:300]}"
        )
        data = resp.json()
        assert isinstance(data, list), f"오브젝트 목록이 배열이 아닙니다: {type(data)}"
        print(f"\n  ✅ review-photos 버킷 존재 확인 (오브젝트 {len(data)}개)")

    # ── RLS 동작 확인 ──

    @pytest.mark.asyncio
    async def test_reviews_rls_blocks_anon_read(self):
        """anon 키로는 reviews 데이터를 읽을 수 없습니다 (RLS 동작 확인)."""
        if not await self._table_exists("reviews"):
            pytest.skip("reviews 테이블 미생성")
        resp = await _rest_get(self._base, "/rest/v1/reviews?select=*", self._headers)
        assert resp.status_code == 200, f"예상치 못한 상태코드: {resp.status_code}"
        data = resp.json()
        assert data == [], (
            f"anon 키로 reviews 데이터가 반환됨 (RLS 미적용 가능성). 행 수: {len(data)}"
        )
        print("\n  ✅ reviews RLS 정상 (anon → 빈 배열)")

    @pytest.mark.asyncio
    async def test_user_profiles_rls_blocks_anon_read(self):
        """anon 키로는 user_profiles 데이터를 읽을 수 없습니다 (RLS 동작 확인)."""
        if not await self._table_exists("user_profiles"):
            pytest.skip("user_profiles 테이블 미생성")
        resp = await _rest_get(self._base, "/rest/v1/user_profiles?select=*", self._headers)
        assert resp.status_code == 200, f"예상치 못한 상태코드: {resp.status_code}"
        data = resp.json()
        assert data == [], (
            f"anon 키로 user_profiles 데이터가 반환됨 (RLS 미적용 가능성). 행 수: {len(data)}"
        )
        print("\n  ✅ user_profiles RLS 정상 (anon → 빈 배열)")

    @pytest.mark.asyncio
    async def test_reviews_rls_blocks_anon_insert(self):
        """anon 키로는 reviews에 INSERT할 수 없습니다 (RLS 동작 확인)."""
        if not await self._table_exists("reviews"):
            pytest.skip("reviews 테이블 미생성")
        payload = {
            "user_id": "00000000-0000-0000-0000-000000000000",
            "place_id": "test",
            "place_name": "test",
            "rating": 1,
            "photo_url": "https://example.com/test.jpg",
        }
        resp = await _rest_post(self._base, "/rest/v1/reviews", self._headers, payload)
        assert resp.status_code in (401, 403), (
            f"anon INSERT가 차단되지 않았습니다 ({resp.status_code}). "
            f"RLS 정책을 확인하세요.\n  응답: {resp.text[:300]}"
        )
        print(f"\n  ✅ reviews INSERT 차단 (anon → {resp.status_code})")
