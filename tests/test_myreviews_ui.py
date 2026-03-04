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

    def test_main_js_search_centering_uses_set_center(self):
        """main.js 검색 시 setCenter로 직접 센터링합니다 (setBounds 비동기 충돌 방지)."""
        src = pathlib.Path("app/static/main.js").read_text()
        fn_start = src.index("async function doSearch")
        fn_end = src.index("/* ===== Autocomplete")
        fn_body = src[fn_start:fn_end]
        assert "map.setCenter(focusPos)" in fn_body
        assert "map.setLevel(level)" in fn_body

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

    def test_css_mobile_fixed_viewport(self):
        """styles.css 모바일 뷰포트가 position: fixed로 iOS 횡스크롤을 차단합니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        assert "position: fixed" in css
        # html/body fixed + app fixed inset:0 이 있어야 함
        assert "inset: 0" in css

    def test_myreviews_js_has_panel_swipe(self):
        """myreviews.js에 바텀시트 스와이프 닫기 제스처가 구현돼 있습니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "initPanelSwipe" in src
        assert "touchstart" in src
        assert "touchmove" in src
        assert "touchend" in src
        assert "dragY" in src

    def test_css_pin_name_bar(self):
        """styles.css에 rv-pin__name 식당명 바와 marquee 애니메이션이 있습니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        assert ".rv-pin__name" in css
        assert "rv-name-scroll" in css
        assert "min(0px" in css  # 짧은 이름 고정 로직

    def test_css_pin_short_name_center(self):
        """styles.css에 rv-pin--short-name 클래스로 짧은 이름 가운데 정렬이 있습니다."""
        css = pathlib.Path("app/static/styles.css").read_text()
        assert "rv-pin--short-name" in css
        assert "text-align: center" in css

    def test_myreviews_js_pin_has_name_bar(self):
        """myreviews.js buildPin()이 식당명 바를 포함하고 짧은 이름 클래스를 부여합니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "rv-pin__name" in src
        assert "rv-pin--short-name" in src
        assert "place_name" in src

    def test_main_js_food_first_ranking(self):
        """main.js에 음식점·카페 우선 정렬 함수가 구현돼 있습니다."""
        src = pathlib.Path("app/static/main.js").read_text()
        assert "rankFoodFirst" in src
        assert "FOOD_CATEGORY_CODES" in src
        assert "FD6" in src
        assert "CE7" in src

    def test_main_js_mobile_zoom_level(self):
        """main.js가 모바일에서 더 넓은 초기 줌 레벨을 사용합니다."""
        src = pathlib.Path("app/static/main.js").read_text()
        assert "innerWidth" in src
        assert "DEFAULT_LEVEL" in src
        # 모바일(640px 이하)에서 더 높은 레벨(줌아웃) 사용
        assert "640" in src

    def test_main_js_no_highlight_circle(self):
        """main.js에 파란 검색 원(highlightArea/highlightCircle)이 없어야 합니다."""
        src = pathlib.Path("app/static/main.js").read_text()
        assert "highlightCircle" not in src
        assert "highlightArea" not in src
        assert "kakao.maps.Circle" not in src

    def test_main_js_reviewed_place_badge(self):
        """main.js가 내가 리뷰한 검색 결과 인포윈도우에 뱃지를 표시합니다."""
        src = pathlib.Path("app/static/main.js").read_text()
        assert "fetchMyReviewedIds" in src
        assert "iw-card__reviewed" in src
        # 마커 위 오버레이 뱃지는 없어야 함 (지도를 가리기 때문)
        assert "search-marker-badge" not in src
        assert "reviewOverlays" not in src

    def test_css_reviewed_badge_styles(self):
        """styles.css에 인포윈도우 리뷰 뱃지 스타일이 있습니다."""
        src = pathlib.Path("app/static/styles.css").read_text()
        assert ".iw-card__reviewed" in src
        assert ".search-marker-badge" not in src


# ===== auth.js 모바일 OAuth 안정성 테스트 =====


class TestAuthJsMobileOAuth:
    """auth.js 모바일 OAuth 안정성 관련 테스트."""

    def test_auth_js_has_oauth_pending_key(self):
        """auth.js가 sessionStorage OAuth 플래그를 사용합니다 (ngrok 인터스티셜 대응)."""
        src = pathlib.Path("app/static/auth.js").read_text()
        assert "OAUTH_PENDING_KEY" in src
        assert "sessionStorage" in src

    def test_auth_js_has_pageshow_handler(self):
        """auth.js가 bfcache 복원을 위한 pageshow 이벤트를 처리합니다 (iOS Safari 대응)."""
        src = pathlib.Path("app/static/auth.js").read_text()
        assert "pageshow" in src
        assert "e.persisted" in src

    def test_auth_js_no_catch_all_showlogin(self):
        """auth.js onAuthStateChange가 SIGNED_OUT/INITIAL_SESSION만 로그인 화면을 표시합니다."""
        src = pathlib.Path("app/static/auth.js").read_text()
        # hadOAuthPending 대응 로직이 있어야 함
        assert "hadOAuthPending" in src
        assert "isOAuthRelated" in src


class TestMyReviewsAdSlotReattach:
    """myreviews.js가 렌더링 후 광고 슬롯을 리스트에 재배치하는지 검증합니다."""

    def test_render_panel_appends_ad_panel(self):
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert 'getElementById("ad-panel")' in src

    def test_render_panel_uses_append_child(self):
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "listEl.appendChild(adPanel)" in src


# ===== 카테고리 필터 테스트 =====


class TestCategoryFilterHTML:
    """index.html에 카테고리 필터 칩 UI가 포함되는지 테스트."""

    @pytest.mark.asyncio
    async def test_filter_container_exists(self, client):
        """필터 칩 컨테이너가 패널 안에 존재합니다."""
        response = await client.get("/")
        assert 'id="mrp-filter"' in response.text

    @pytest.mark.asyncio
    async def test_filter_has_all_categories(self, client):
        """전체/식당/카페/관광명소/기타 5개 필터 칩이 존재합니다."""
        body = (await client.get("/")).text
        for cat in ("all", "restaurant", "cafe", "attraction", "etc"):
            assert f'data-category="{cat}"' in body

    @pytest.mark.asyncio
    async def test_filter_has_count_badges(self, client):
        """각 카테고리별 카운트 뱃지 요소가 존재합니다."""
        body = (await client.get("/")).text
        for cat in ("all", "restaurant", "cafe", "attraction", "etc"):
            assert f'data-cat-count="{cat}"' in body

    @pytest.mark.asyncio
    async def test_all_chip_is_active_by_default(self, client):
        """'전체' 칩이 기본적으로 is-active 클래스를 가집니다."""
        body = (await client.get("/")).text
        # 전체 칩은 is-active, 나머지는 아님
        assert 'mrp-filter__chip is-active" data-category="all"' in body


class TestCategoryFilterJS:
    """myreviews.js 카테고리 필터 로직이 구현되어 있는지 테스트."""

    def test_has_category_map(self):
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "CATEGORY_MAP" in src
        assert '"음식점"' in src
        assert '"카페"' in src
        assert '"관광명소"' in src

    def test_has_classify_category(self):
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "classifyCategory" in src

    def test_has_get_filtered_reviews(self):
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "getFilteredReviews" in src

    def test_has_active_category_state(self):
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "activeCategory" in src

    def test_compute_clusters_uses_filtered(self):
        """computeClusters가 getFilteredReviews를 사용합니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        # computeClusters 함수 내에서 allReviews 대신 getFilteredReviews 사용
        idx = src.index("function computeClusters()")
        body = src[idx : idx + 300]
        assert "getFilteredReviews()" in body
        assert "allReviews" not in body

    def test_render_panel_uses_filtered(self):
        """renderPanel이 getFilteredReviews를 사용합니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        idx = src.index("function renderPanel()")
        body = src[idx : idx + 300]
        assert "getFilteredReviews()" in body

    def test_has_init_category_filter(self):
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "initCategoryFilter" in src

    def test_has_update_category_badges(self):
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "updateCategoryBadges" in src

    def test_has_reset_category_filter(self):
        """비활성화 시 카테고리 필터를 초기화합니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "resetCategoryFilter" in src

    def test_deactivate_resets_filter(self):
        """deactivate 함수에서 resetCategoryFilter를 호출합니다."""
        src = pathlib.Path("app/static/myreviews.js").read_text()
        idx = src.index("function deactivate()")
        body = src[idx : idx + 400]
        assert "resetCategoryFilter()" in body


class TestCategoryFilterCSS:
    """styles.css에 카테고리 필터 칩 스타일이 있는지 테스트."""

    def test_css_has_filter_container(self):
        css = pathlib.Path("app/static/styles.css").read_text()
        assert ".mrp-filter" in css

    def test_css_has_chip_styles(self):
        css = pathlib.Path("app/static/styles.css").read_text()
        assert ".mrp-filter__chip" in css
        assert ".mrp-filter__chip.is-active" in css

    def test_css_has_count_styles(self):
        css = pathlib.Path("app/static/styles.css").read_text()
        assert ".mrp-filter__count" in css


class TestCategoryFilterI18n:
    """i18n.js에 카테고리 번역 키가 있는지 테스트."""

    def test_i18n_has_category_keys(self):
        src = pathlib.Path("app/static/i18n.js").read_text()
        for key in ("category.all", "category.restaurant", "category.cafe",
                     "category.attraction", "category.etc"):
            assert key in src


# ===== PWA 테스트 =====


class TestPWA:
    """PWA manifest 및 아이콘 파일이 올바르게 구성되는지 테스트."""

    def test_manifest_file_exists(self):
        f = pathlib.Path("app/static/manifest.json")
        assert f.exists()

    def test_manifest_has_standalone_display(self):
        import json
        data = json.loads(pathlib.Path("app/static/manifest.json").read_text())
        assert data["display"] == "standalone"

    def test_manifest_has_icons(self):
        import json
        data = json.loads(pathlib.Path("app/static/manifest.json").read_text())
        sizes = [icon["sizes"] for icon in data["icons"]]
        assert "192x192" in sizes
        assert "512x512" in sizes

    def test_pwa_icon_files_exist(self):
        assert pathlib.Path("app/static/icon-pwa-192.png").exists()
        assert pathlib.Path("app/static/icon-pwa-512.png").exists()

    def test_css_has_safe_area_inset(self):
        css = pathlib.Path("app/static/styles.css").read_text()
        assert "safe-area-inset-bottom" in css


# ===== i18n 관광명소 강조 테스트 =====


class TestI18nAttractionEmphasis:
    """i18n 번역에 관광명소·기여→추천 메시지가 포함되는지 테스트."""

    def test_ko_login_subtitle_has_attraction(self):
        src = pathlib.Path("app/static/i18n.js").read_text()
        assert "관광명소를 기록하고" in src

    def test_ko_login_feature_search_has_attraction(self):
        src = pathlib.Path("app/static/i18n.js").read_text()
        assert "음식점·카페·관광명소 실시간 검색" in src

    def test_ko_search_placeholder_has_attraction(self):
        src = pathlib.Path("app/static/i18n.js").read_text()
        assert "음식점·카페·관광명소 검색" in src

    def test_ko_tutorial_step1_has_attraction(self):
        src = pathlib.Path("app/static/i18n.js").read_text()
        assert "맛집·카페·관광명소를 기록하고" in src

    def test_ko_tutorial_step5_emphasizes_contribution(self):
        src = pathlib.Path("app/static/i18n.js").read_text()
        assert "기여하면" in src

    def test_en_login_has_attractions(self):
        src = pathlib.Path("app/static/i18n.js").read_text()
        assert "cafes & attractions" in src

    def test_en_tutorial_step1_has_attractions(self):
        src = pathlib.Path("app/static/i18n.js").read_text()
        assert "cafes & attractions" in src

    def test_en_tutorial_step5_emphasizes_contribution(self):
        src = pathlib.Path("app/static/i18n.js").read_text()
        assert "Contribute 10" in src

    def test_ja_login_has_attractions(self):
        src = pathlib.Path("app/static/i18n.js").read_text()
        assert "観光地を記録" in src

    def test_zh_login_has_attractions(self):
        src = pathlib.Path("app/static/i18n.js").read_text()
        assert "景点" in src

    @pytest.mark.asyncio
    async def test_html_fallback_has_attraction(self, client):
        response = await client.get("/")
        assert "관광명소" in response.text


# ===== 리뷰 모달 모바일 횡스크롤 수정 테스트 =====


class TestReviewModalMobileScroll:
    """모바일 리뷰 모달에 overflow-x: hidden이 적용되는지 테스트."""

    def test_review_modal_mobile_overflow_x_hidden(self):
        css = pathlib.Path("app/static/styles.css").read_text()
        # 모바일 review-modal 블록에 overflow-x: hidden이 존재
        mobile_section = css[css.index("@media (max-width: 520px)"):]
        modal_block = mobile_section[mobile_section.index(".review-modal"):mobile_section.index(".review-modal") + 400]
        assert "overflow-x: hidden" in modal_block

    def test_review_modal_mobile_safe_area_top(self):
        """모바일 리뷰 모달이 Dynamic Island/노치 영역을 피하는지 확인."""
        css = pathlib.Path("app/static/styles.css").read_text()
        mobile_section = css[css.index("@media (max-width: 520px)"):]
        modal_block = mobile_section[mobile_section.index(".review-modal"):mobile_section.index(".review-modal") + 500]
        assert "safe-area-inset-top" in modal_block
        assert "100dvh" in modal_block

    def test_review_textarea_mobile_font_size_16px(self):
        """iOS Safari 자동 확대 방지: 모바일에서 textarea font-size >= 1rem(16px)."""
        css = pathlib.Path("app/static/styles.css").read_text()
        mobile_section = css[css.index("@media (max-width: 520px)"):]
        assert ".review-textarea" in mobile_section
        textarea_idx = mobile_section.index(".review-textarea")
        textarea_block = mobile_section[textarea_idx:textarea_idx + 200]
        assert "font-size: 1rem" in textarea_block


# ===== 검색 센터링 수정 테스트 =====


class TestSearchCentering:
    """검색 시 지도가 첫 결과에 정확히 센터링되는지 테스트."""

    def test_render_place_returns_data(self):
        """renderPlace가 { marker, content, pos } 을 반환하는지 확인."""
        src = pathlib.Path("app/static/main.js").read_text()
        assert "return { marker, content, pos }" in src

    def test_render_place_no_auto_open_infowindow(self):
        """renderPlace 함수 본문에서 infoWindow.open을 직접 호출하지 않는지 확인."""
        src = pathlib.Path("app/static/main.js").read_text()
        fn_start = src.index("function renderPlace")
        fn_end = src.index("\n/* ", fn_start + 1)
        fn_body = src[fn_start:fn_end]
        assert fn_body.count("infoWindow.open") == 1

    def test_no_set_bounds_call_in_do_search(self):
        """doSearch에서 map.setBounds() 호출이 없는지 확인 (비동기 애니메이션 충돌 방지)."""
        src = pathlib.Path("app/static/main.js").read_text()
        fn_start = src.index("async function doSearch")
        fn_end = src.index("/* ===== Autocomplete")
        fn_body = src[fn_start:fn_end]
        assert "map.setBounds(" not in fn_body

    def test_do_search_uses_distance_based_level(self):
        """doSearch에서 결과 분포 거리 기반으로 줌 레벨을 계산하는지 확인."""
        src = pathlib.Path("app/static/main.js").read_text()
        fn_start = src.index("async function doSearch")
        fn_end = src.index("/* ===== Autocomplete")
        fn_body = src[fn_start:fn_end]
        assert "distanceKm(focusPos" in fn_body
        assert "maxDist" in fn_body

    def test_infowindow_opens_with_delay(self):
        """InfoWindow가 setTimeout으로 지연 열리는지 확인 (auto-pan 충돌 방지)."""
        src = pathlib.Path("app/static/main.js").read_text()
        fn_start = src.index("async function doSearch")
        fn_end = src.index("/* ===== Autocomplete")
        fn_body = src[fn_start:fn_end]
        assert "setTimeout(" in fn_body
        assert "infoWindow.open" in fn_body


# ===== 모바일 검색 input iOS 자동 확대 방지 테스트 =====


class TestSearchInputMobileFontSize:
    """모바일에서 검색 input의 iOS 자동 확대 방지."""

    def test_search_input_mobile_font_size(self):
        css = pathlib.Path("app/static/styles.css").read_text()
        mobile_section = css[css.index("@media (max-width: 640px)"):]
        assert ".search input" in mobile_section
        input_idx = mobile_section.index(".search input")
        input_block = mobile_section[input_idx:input_idx + 200]
        assert "font-size: 1rem" in input_block


# ===== 자동완성 주차장 버그 수정 테스트 =====


class TestAutocompleteFix:
    """selectSuggestion이 doSearch 대신 showSelectedPlace를 호출하는지 테스트."""

    def test_select_suggestion_uses_show_selected_place(self):
        src = pathlib.Path("app/static/main.js").read_text()
        assert "showSelectedPlace(place)" in src

    def test_show_selected_place_function_exists(self):
        src = pathlib.Path("app/static/main.js").read_text()
        assert "async function showSelectedPlace" in src

    def test_select_suggestion_does_not_call_do_search(self):
        src = pathlib.Path("app/static/main.js").read_text()
        # selectSuggestion 함수 내에서 doSearch를 호출하지 않아야 함
        fn_start = src.index("function selectSuggestion")
        fn_end = src.index("async function showSelectedPlace")
        fn_body = src[fn_start:fn_end]
        assert "doSearch" not in fn_body


# ===== 리뷰 캐시 모듈 테스트 =====


class TestReviewCacheModule:
    """reviewCache.js 모듈이 올바르게 구성되는지 테스트."""

    def test_review_cache_file_exists(self):
        assert pathlib.Path("app/static/reviewCache.js").exists()

    def test_review_cache_exposes_global_api(self):
        src = pathlib.Path("app/static/reviewCache.js").read_text()
        assert "window.__reviewCache" in src

    def test_review_cache_has_get_my_reviews(self):
        src = pathlib.Path("app/static/reviewCache.js").read_text()
        assert "async function getMyReviews" in src

    def test_review_cache_has_invalidate(self):
        src = pathlib.Path("app/static/reviewCache.js").read_text()
        assert "function invalidate" in src

    def test_review_cache_has_get_reviewed_place_ids(self):
        src = pathlib.Path("app/static/reviewCache.js").read_text()
        assert "async function getReviewedPlaceIds" in src

    def test_review_cache_has_get_visit_count(self):
        src = pathlib.Path("app/static/reviewCache.js").read_text()
        assert "async function getVisitCount" in src

    def test_review_cache_has_ttl(self):
        src = pathlib.Path("app/static/reviewCache.js").read_text()
        assert "CACHE_TTL" in src


class TestReviewCacheIntegration:
    """다른 모듈이 reviewCache를 올바르게 사용하는지 테스트."""

    def test_myreviews_uses_cache_for_activate(self):
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "__reviewCache?.getMyReviews()" in src

    def test_myreviews_uses_cache_for_refresh(self):
        src = pathlib.Path("app/static/myreviews.js").read_text()
        assert "__reviewCache?.getMyReviews(true)" in src

    def test_main_uses_cache_for_reviewed_ids(self):
        src = pathlib.Path("app/static/main.js").read_text()
        assert "__reviewCache?.getReviewedPlaceIds" in src

    def test_reviews_uses_cache_for_visit_count(self):
        src = pathlib.Path("app/static/reviews.js").read_text()
        assert "__reviewCache?.getVisitCount" in src

    def test_reviews_invalidates_cache_on_save(self):
        src = pathlib.Path("app/static/reviews.js").read_text()
        assert "__reviewCache?.invalidate()" in src

    @pytest.mark.asyncio
    async def test_html_includes_review_cache_script(self, client):
        response = await client.get("/")
        assert "reviewCache.js" in response.text
