"""내 맛집 클러스터 맵 UI 테스트 (HTML 렌더링 확인)."""

from __future__ import annotations

import pathlib
import re

import pytest


# ===== 내 맛집 버튼 테스트 =====


class TestMyReviewsButton:
    """헤더의 '내 맛집' 토글 버튼이 HTML에 포함되는지 테스트."""

    @pytest.mark.asyncio
    async def test_my_reviews_btn_exists(self, client):
        """내 맛집 토글 버튼이 헤더에 포함됩니다."""
        response = await client.get("/")
        assert 'id="my-reviews-btn"' in response.text

    @pytest.mark.asyncio
    async def test_my_reviews_btn_label(self, client):
        """버튼 레이블 '내 맛집' 텍스트가 포함됩니다."""
        response = await client.get("/")
        assert "내 맛집" in response.text

    @pytest.mark.asyncio
    async def test_my_reviews_btn_class(self, client):
        """버튼에 토글용 CSS 클래스가 적용됩니다."""
        response = await client.get("/")
        assert 'class="my-reviews-toggle"' in response.text


# ===== 리뷰 상세 패널 테스트 =====


class TestReviewDetailPanel:
    """리뷰 상세 bottom sheet HTML이 포함되는지 테스트."""

    @pytest.mark.asyncio
    async def test_review_detail_container(self, client):
        """리뷰 상세 패널 컨테이너가 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="review-detail"' in body

    @pytest.mark.asyncio
    async def test_review_detail_backdrop(self, client):
        """어두운 배경 오버레이 엘리먼트가 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="review-detail-backdrop"' in body
        assert "review-detail-backdrop" in body

    @pytest.mark.asyncio
    async def test_review_detail_has_place_info(self, client):
        """장소명·주소 표시 영역이 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="review-detail-name"' in body
        assert 'id="review-detail-address"' in body

    @pytest.mark.asyncio
    async def test_review_detail_has_photo(self, client):
        """사진 img 태그가 포함됩니다."""
        response = await client.get("/")
        assert 'id="review-detail-photo"' in response.text

    @pytest.mark.asyncio
    async def test_review_detail_has_rating_and_date(self, client):
        """별점·방문일 표시 영역이 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="review-detail-rating"' in body
        assert 'id="review-detail-date"' in body

    @pytest.mark.asyncio
    async def test_review_detail_has_nav_controls(self, client):
        """같은 장소 여러 방문 스와이프 내비게이션 컨트롤이 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'id="review-detail-nav"' in body
        assert 'id="review-detail-prev"' in body
        assert 'id="review-detail-next"' in body
        assert 'id="review-detail-counter"' in body

    @pytest.mark.asyncio
    async def test_review_detail_has_text(self, client):
        """리뷰 텍스트 표시 영역이 포함됩니다."""
        response = await client.get("/")
        assert 'id="review-detail-text"' in response.text

    @pytest.mark.asyncio
    async def test_review_detail_has_close_button(self, client):
        """닫기 버튼이 포함됩니다."""
        response = await client.get("/")
        assert 'id="review-detail-close"' in response.text

    @pytest.mark.asyncio
    async def test_review_detail_has_handle(self, client):
        """bottom sheet 드래그 핸들이 포함됩니다."""
        response = await client.get("/")
        assert "review-detail__handle" in response.text

    @pytest.mark.asyncio
    async def test_review_detail_is_accessible(self, client):
        """리뷰 상세 패널에 접근성 속성이 적용됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'role="dialog"' in body
        assert 'aria-modal="true"' in body


# ===== myreviews.js 로드 테스트 =====


class TestMyReviewsScriptLoaded:
    """myreviews.js 스크립트가 올바르게 로드되는지 테스트."""

    @pytest.mark.asyncio
    async def test_myreviews_js_loaded(self, client):
        """HTML에 myreviews.js 스크립트 태그가 포함됩니다."""
        response = await client.get("/")
        assert "myreviews.js" in response.text

    @pytest.mark.asyncio
    async def test_myreviews_js_has_cache_buster(self, client):
        """myreviews.js URL에 캐시 버스터 쿼리 파라미터가 포함됩니다."""
        response = await client.get("/")
        assert re.search(r"myreviews\.js\?v=\d+", response.text), (
            "myreviews.js에 캐시 버스터 없음"
        )

    @pytest.mark.asyncio
    async def test_myreviews_js_is_module(self, client):
        """myreviews.js가 ES 모듈로 로드됩니다."""
        response = await client.get("/")
        assert 'type="module"' in response.text

    def test_myreviews_js_file_exists(self):
        """myreviews.js 파일이 static 디렉토리에 존재합니다."""
        f = pathlib.Path("app/static/myreviews.js")
        assert f.exists(), "app/static/myreviews.js 파일이 없습니다"

    def test_myreviews_js_exposes_globals(self):
        """myreviews.js가 window 전역 인터페이스를 노출합니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "window.__activateMyReviews" in src
        assert "window.__deactivateMyReviews" in src
        assert "window.__refreshMyReviews" in src

    def test_myreviews_js_has_cluster_function(self):
        """myreviews.js에 클러스터링 함수가 구현돼 있습니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "computeClusters" in src
        assert "GRID_DEG" in src  # 지리 격자 기반 클러스터링

    def test_myreviews_js_has_animation_function(self):
        """myreviews.js에 플라잉 애니메이션 함수가 구현돼 있습니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "animateTransition" in src
        assert "animateOut" in src

    def test_myreviews_js_builds_cluster_element(self):
        """myreviews.js가 클러스터 및 개별 핀 엘리먼트를 생성합니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "buildCluster" in src
        assert "buildPin" in src
        assert "rv-cluster" in src
        assert "rv-pin" in src

    def test_myreviews_js_uses_escape_for_xss(self):
        """myreviews.js가 사용자 데이터를 이스케이프 처리합니다 (XSS 방지)."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "escAttr" in src
        # img src에 escAttr 적용 확인
        assert "escAttr(src)" in src or "escAttr(review.photo_url)" in src


# ===== main.js 전역 노출 테스트 =====


class TestMainJsGlobals:
    """main.js가 myreviews.js에 필요한 전역을 노출하는지 테스트."""

    def test_main_js_exposes_get_map(self):
        """main.js가 window.__getMap을 노출합니다."""
        src = pathlib.Path("app/static/main.js").read_text()
        assert "window.__getMap" in src

    def test_main_js_exposes_clear_search_markers(self):
        """main.js가 window.__clearSearchMarkers를 노출합니다."""
        src = pathlib.Path("app/static/main.js").read_text()
        assert "window.__clearSearchMarkers" in src


# ===== CSS 스타일 존재 테스트 =====


class TestMyReviewsStyles:
    """클러스터 핀 및 상세 패널 CSS 클래스가 styles.css에 존재하는지 테스트."""

    def test_css_has_cluster_styles(self):
        """styles.css에 클러스터 오버레이 스타일이 포함됩니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        assert ".rv-cluster" in css
        assert ".rv-cluster__grid" in css
        assert ".rv-cluster__badge" in css
        assert ".rv-cluster__tail" in css

    def test_css_has_pin_styles(self):
        """styles.css에 개별 핀 스타일이 포함됩니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        assert ".rv-pin" in css
        assert ".rv-pin__photo" in css
        assert ".rv-pin__rating" in css
        assert ".rv-pin__tail" in css

    def test_css_has_review_detail_styles(self):
        """styles.css에 리뷰 상세 패널 스타일이 포함됩니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        assert ".review-detail" in css
        assert ".review-detail-backdrop" in css
        assert ".review-detail__photo" in css
        assert ".review-detail__body" in css

    def test_css_has_my_reviews_toggle_styles(self):
        """styles.css에 내 맛집 토글 버튼 스타일이 포함됩니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        assert ".my-reviews-toggle" in css
        assert ".my-reviews-toggle.is-active" in css

    def test_css_review_detail_has_transition(self):
        """리뷰 상세 패널에 슬라이드 트랜지션이 정의됩니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        # bottom sheet 열림 클래스
        assert ".review-detail.is-open" in css
        # translateY 슬라이드
        assert "translateY" in css

    def test_css_has_side_panel_styles(self):
        """styles.css에 내 맛집 사이드 패널 스타일이 포함됩니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        assert ".my-reviews-panel" in css
        assert ".my-reviews-panel.is-open" in css
        assert ".my-reviews-panel__list" in css

    def test_css_has_region_group_styles(self):
        """styles.css에 지역 그룹 아이템 스타일이 포함됩니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        assert ".mrp-group" in css
        assert ".mrp-group__photos" in css
        assert ".mrp-group__name" in css
        assert ".mrp-group__count" in css

    def test_css_side_panel_uses_translate(self):
        """사이드 패널은 translateX 슬라이드 방식을 사용합니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        assert "translateX(100%)" in css
        assert "translateX(0)" in css


# ===== 사이드 패널 HTML 테스트 =====


class TestMyReviewsSidePanel:
    """내 맛집 사이드 패널 HTML이 올바르게 포함되는지 테스트."""

    @pytest.mark.asyncio
    async def test_side_panel_container(self, client):
        """사이드 패널 컨테이너가 포함됩니다."""
        response = await client.get("/")
        assert 'id="my-reviews-panel"' in response.text

    @pytest.mark.asyncio
    async def test_side_panel_header(self, client):
        """사이드 패널 헤더 요소가 포함됩니다."""
        response = await client.get("/")
        body = response.text
        assert 'class="my-reviews-panel__title"' in body
        assert 'id="my-reviews-panel-count"' in body

    @pytest.mark.asyncio
    async def test_side_panel_list_container(self, client):
        """사이드 패널 리스트 컨테이너가 포함됩니다."""
        response = await client.get("/")
        assert 'id="my-reviews-panel-list"' in response.text

    @pytest.mark.asyncio
    async def test_side_panel_is_inside_app(self, client):
        """사이드 패널이 #app 컨테이너 안에 위치합니다 (로그인 전 숨김)."""
        response = await client.get("/")
        body = response.text
        app_pos = body.find('id="app"')
        panel_pos = body.find('id="my-reviews-panel"')
        assert app_pos < panel_pos, "사이드 패널이 #app 바깥에 있습니다"

    @pytest.mark.asyncio
    async def test_side_panel_has_aria_label(self, client):
        """사이드 패널에 접근성 레이블이 적용됩니다."""
        response = await client.get("/")
        assert 'aria-label="내 맛집 목록"' in response.text

    def test_myreviews_js_has_panel_functions(self):
        """myreviews.js에 사이드 패널 함수가 구현돼 있습니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "showPanel" in src
        assert "hidePanel" in src
        assert "renderPanel" in src
        assert "groupByRegion" in src
        assert "renderPanelLevel1" in src

    def test_myreviews_js_has_region_extractor(self):
        """myreviews.js에 주소에서 지역명을 추출하는 함수가 있습니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "extractRegion" in src

    def test_myreviews_js_uses_geographic_clustering(self):
        """myreviews.js가 지리 격자 기반 클러스터링을 사용합니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "GRID_DEG" in src
        assert "getGridDeg" in src
        assert "Math.floor(lat / grid)" in src

    def test_myreviews_js_handles_pixel_api_fallback(self):
        """myreviews.js가 Kakao Maps 픽셀 API 버전 차이를 처리합니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        # 두 가지 메서드명 모두 시도
        assert "containerPointFromCoords" in src
        assert "containerPixelFromCoords" in src

    def test_myreviews_js_does_not_use_add_listener_once(self):
        """myreviews.js가 미존재 API addListenerOnce를 호출하지 않습니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        # 'event.addListenerOnce(' 패턴으로 실제 호출 여부 확인
        assert "event.addListenerOnce(" not in src

    def test_myreviews_js_has_idle_fallback_timeout(self):
        """myreviews.js가 idle 이벤트 미발생 대비 setTimeout 폴백을 갖습니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "idleRendered" in src
        assert "onFirstIdle" in src

    def test_myreviews_js_deduplicates_same_place(self):
        """myreviews.js가 같은 장소 여러 리뷰를 place_id로 합산합니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "place_id" in src
        assert "placeMap" in src

    def test_myreviews_js_has_swipe_detail(self):
        """myreviews.js에 리뷰 스와이프 상세 뷰 로직이 구현돼 있습니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "detailCluster" in src
        assert "detailIdx" in src
        assert "_renderDetailContent" in src
        assert "review-detail-prev" in src
        assert "review-detail-next" in src

    def test_myreviews_js_badge_always_shows(self):
        """클러스터 배지가 항상 표시되도록 count > MAX_CLUSTER_PHOTOS 조건이 없습니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "rv-cluster__badge" in src
        assert "count > MAX_CLUSTER_PHOTOS" not in src

    def test_myreviews_js_has_panel_drilldown_back(self):
        """사이드 패널 드릴다운에 뒤로가기 버튼 HTML이 있습니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "mrp-back" in src
        assert "mrp-back__btn" in src
        assert "mrp-place" in src

    def test_main_js_has_infowindow_close_btn(self):
        """main.js 인포윈도우 카드에 닫기 버튼이 있습니다."""
        src = pathlib.Path("app/static/main.js").read_text()
        assert "iw-card__close-btn" in src

    def test_css_has_infowindow_close_btn(self):
        """styles.css에 인포윈도우 닫기 버튼 스타일이 있습니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        assert ".iw-card__close-btn" in css

    def test_css_has_review_detail_nav(self):
        """styles.css에 리뷰 상세 내비게이션 스타일이 있습니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        assert ".review-detail__nav" in css
        assert ".review-detail__nav-btn" in css
        assert ".review-detail__counter" in css

    def test_css_has_panel_drilldown_styles(self):
        """styles.css에 사이드 패널 드릴다운 스타일이 있습니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        assert ".mrp-back" in css
        assert ".mrp-place" in css
        assert ".mrp-place__photo" in css

    def test_myreviews_js_pin_has_no_multi_badge(self):
        """개별 핀에는 다중 방문 배지를 표시하지 않습니다 (같은 식당은 1개로 카운트)."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "rv-pin__multi" not in src

    def test_main_js_search_centering_uses_idle_event(self):
        """main.js 다중 결과 검색 시 setBounds 완료를 idle 이벤트로 감지합니다."""
        src = pathlib.Path("app/static/main.js").read_text()
        # idle 이벤트 기반 중심 고정 (첫 검색에서 level 12→5 애니메이션 대응)
        assert "onBoundsIdle" in src
        assert "addListener" in src
        assert "removeListener" in src

    def test_css_infowindow_name_word_break(self):
        """styles.css 인포윈도우 가게 이름에 줄바꿈 처리가 있습니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        assert "word-break: keep-all" in css
        assert "overflow-wrap: break-word" in css

    def test_css_infowindow_actions_row(self):
        """styles.css 인포윈도우 액션 영역이 row 방향으로 버튼을 한 줄에 표시합니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        assert "flex-direction: row" in css
        assert "flex-wrap: wrap" in css
