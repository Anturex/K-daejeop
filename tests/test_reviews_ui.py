"""리뷰 모달 & 튜토리얼 UI 테스트 (HTML 렌더링 확인)."""

from __future__ import annotations

import re

import pytest


# ===== 리뷰 모달 HTML 테스트 =====


class TestReviewModalPresent:
    """index 페이지에 리뷰 모달 HTML이 포함되는지 테스트."""

    @pytest.mark.asyncio
    async def test_review_modal_container(self, client):
        """리뷰 모달 컨테이너가 hidden 상태로 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="review-modal"' in body
        assert 'id="review-overlay"' in body

    @pytest.mark.asyncio
    async def test_review_modal_has_rating_cards(self, client):
        """별점 카드 3종이 모두 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'data-rating="1"' in body
        assert 'data-rating="2"' in body
        assert 'data-rating="3"' in body
        assert "동네 맛집" in body
        assert "추천 맛집" in body
        assert "인생 맛집" in body

    @pytest.mark.asyncio
    async def test_review_modal_has_photo_upload(self, client):
        """사진 업로드 영역이 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="photo-zone"' in body
        assert 'id="photo-input"' in body
        assert 'accept="image/*,.heic,.heif"' in body

    @pytest.mark.asyncio
    async def test_review_modal_has_text_area(self, client):
        """리뷰 textarea가 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="review-text"' in body
        assert "리뷰" in body

    @pytest.mark.asyncio
    async def test_review_modal_has_date_picker(self, client):
        """날짜 선택 휠이 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="wheel-year"' in body
        assert 'id="wheel-month"' in body
        assert 'id="wheel-day"' in body
        assert "방문 날짜" in body

    @pytest.mark.asyncio
    async def test_review_modal_has_submit_button(self, client):
        """제출 버튼이 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="review-submit-btn"' in body
        assert "리뷰 저장하기" in body

    @pytest.mark.asyncio
    async def test_review_modal_has_close_buttons(self, client):
        """닫기/취소 버튼이 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="review-close-btn"' in body
        assert 'id="review-cancel-btn"' in body

    @pytest.mark.asyncio
    async def test_review_modal_has_error_area(self, client):
        """에러 메시지 영역이 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="review-error"' in body

    @pytest.mark.asyncio
    async def test_review_modal_place_info_area(self, client):
        """장소 정보 표시 영역이 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="review-place-name"' in body
        assert 'id="review-place-meta"' in body


# ===== 튜토리얼 HTML 테스트 =====


class TestTutorialPresent:
    """index 페이지에 튜토리얼 HTML이 포함되는지 테스트."""

    @pytest.mark.asyncio
    async def test_tutorial_overlay_container(self, client):
        """튜토리얼 오버레이 컨테이너가 hidden 상태로 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="tutorial-overlay"' in body

    @pytest.mark.asyncio
    async def test_tutorial_card_elements(self, client):
        """튜토리얼 카드 구성 요소가 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="tutorial-card"' in body
        assert 'id="tutorial-icon"' in body
        assert 'id="tutorial-title"' in body
        assert 'id="tutorial-body"' in body
        assert 'id="tutorial-dots"' in body

    @pytest.mark.asyncio
    async def test_tutorial_navigation_buttons(self, client):
        """튜토리얼 네비게이션 버튼이 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="tutorial-prev"' in body
        assert 'id="tutorial-next"' in body
        assert 'id="tutorial-skip"' in body

    @pytest.mark.asyncio
    async def test_tutorial_toggle_in_user_menu(self, client):
        """유저 메뉴에 '튜토리얼 다시 보기' 버튼이 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="tutorial-toggle-btn"' in body
        assert "튜토리얼 다시 보기" in body


# ===== 정적 파일 로드 테스트 =====


class TestReviewScriptsLoaded:
    """리뷰 및 튜토리얼 JS 파일이 로드되는지 테스트."""

    @pytest.mark.asyncio
    async def test_reviews_js_loaded(self, client):
        """HTML에 reviews.js 스크립트가 포함됩니다."""
        response = await client.get("/")
        assert "reviews.js" in response.text

    @pytest.mark.asyncio
    async def test_tutorial_js_loaded(self, client):
        """HTML에 tutorial.js 스크립트가 포함됩니다."""
        response = await client.get("/")
        assert "tutorial.js" in response.text

    @pytest.mark.asyncio
    async def test_js_files_have_cache_buster(self, client):
        """새 JS 파일에도 캐시 버스터가 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert re.search(r"reviews\.js\?v=\d+", body), "reviews.js에 캐시 버스터 없음"
        assert re.search(r"tutorial\.js\?v=\d+", body), "tutorial.js에 캐시 버스터 없음"


# ===== SQL 마이그레이션 파일 존재 테스트 =====


class TestMigrationFileExists:
    """SQL 마이그레이션 파일이 존재하는지 테스트."""

    def test_migration_file_exists(self):
        """리뷰/프로필 마이그레이션 SQL 파일이 존재합니다."""
        import pathlib

        migration = pathlib.Path("supabase/migrations/001_reviews_and_profiles.sql")
        assert migration.exists(), "SQL 마이그레이션 파일이 없습니다"

    def test_migration_contains_reviews_table(self):
        """마이그레이션에 reviews 테이블 정의가 포함됩니다."""
        import pathlib

        sql = pathlib.Path("supabase/migrations/001_reviews_and_profiles.sql").read_text()
        assert "create table" in sql.lower()
        assert "reviews" in sql.lower()
        assert "user_profiles" in sql.lower()

    def test_migration_contains_rls_policies(self):
        """마이그레이션에 RLS 정책이 포함됩니다."""
        import pathlib

        sql = pathlib.Path("supabase/migrations/001_reviews_and_profiles.sql").read_text()
        assert "enable row level security" in sql.lower()
        assert "create policy" in sql.lower()

    def test_migration_contains_storage_bucket(self):
        """마이그레이션에 review-photos 스토리지 버킷 정의가 포함됩니다."""
        import pathlib

        sql = pathlib.Path("supabase/migrations/001_reviews_and_profiles.sql").read_text()
        assert "review-photos" in sql

    def test_migration_contains_trigger(self):
        """마이그레이션에 신규 유저 프로필 자동생성 트리거가 포함됩니다."""
        import pathlib

        sql = pathlib.Path("supabase/migrations/001_reviews_and_profiles.sql").read_text()
        assert "handle_new_user" in sql
        assert "on_auth_user_created" in sql

    @pytest.mark.asyncio
    async def test_review_modal_has_visit_badge(self, client):
        """리뷰 모달에 N번째 방문 뱃지 요소가 있습니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="review-visit-badge"' in body
        assert 'review-visit-badge' in body

    def test_reviews_js_has_visit_badge_logic(self):
        """reviews.js에 N번째 방문 뱃지 로직이 있습니다."""
        import pathlib
        src = pathlib.Path("app/static/reviews.js").read_text()
        assert "visitBadgeEl" in src
        assert "loadVisitCount" in src
        assert "번째 방문" in src

    def test_myreviews_js_cluster_deduplicates_photos(self):
        """buildCluster가 place_id 기준으로 사진을 중복 제거합니다."""
        import pathlib
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "uniqueReviews" in src
        assert "seen.has(key)" in src

    def test_css_has_visit_badge_style(self):
        """styles.css에 N번째 방문 뱃지 스타일이 있습니다."""
        import pathlib
        css = pathlib.Path("app/static/styles.css").read_text()
        assert ".review-visit-badge" in css

    @pytest.mark.asyncio
    async def test_html_has_heic2any_script(self, client):
        """index.html에 heic2any CDN 스크립트가 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert "heic2any" in body

    @pytest.mark.asyncio
    async def test_html_photo_input_accepts_heic(self, client):
        """파일 입력에 .heic/.heif 확장자가 허용됩니다."""
        response = await client.get("/")
        body = response.text
        assert ".heic" in body
        assert ".heif" in body

    def test_reviews_js_has_heic_conversion(self):
        """reviews.js에 HEIC 감지 및 변환 로직이 있습니다."""
        import pathlib
        src = pathlib.Path("app/static/reviews.js").read_text()
        assert "isHeicFile" in src
        assert "heic2any" in src
        assert "image/heic" in src
        assert "image/jpeg" in src

    def test_reviews_js_isheicfile_ios_guard(self):
        """isHeicFile이 MIME type이 image/*이면 false를 반환합니다 (iOS JPEG with .heic filename)."""
        import pathlib
        src = pathlib.Path("app/static/reviews.js").read_text()
        # iOS Safari sends image/jpeg MIME type even for .heic files
        # The guard prevents heic2any being called on already-decoded JPEG
        assert 'file.type.startsWith("image/")' in src
        assert "return false" in src
