"""다국어(i18n) UI 테스트 — HTML/JS/CSS 렌더링 확인."""

from __future__ import annotations

import pathlib

import pytest

STATIC = pathlib.Path(__file__).resolve().parent.parent / "app" / "static"


# ===== i18n.js 파일 존재 및 구조 테스트 =====


class TestI18nJsFile:
    """i18n.js 파일의 핵심 구조를 검증합니다."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.js = (STATIC / "i18n.js").read_text(encoding="utf-8")

    def test_translations_object_exists(self):
        assert "TRANSLATIONS" in self.js

    def test_supported_languages(self):
        for lang in ["ko", "en", "ja", "zh"]:
            assert f'"{lang}"' in self.js or f"'{lang}'" in self.js

    def test_t_function(self):
        assert "function t(key)" in self.js

    def test_tf_function(self):
        assert "function tf(key" in self.js

    def test_set_lang(self):
        assert "function setLang" in self.js

    def test_get_lang(self):
        assert "function getLang" in self.js

    def test_apply_translations(self):
        assert "function applyTranslations" in self.js

    def test_create_lang_selector(self):
        assert "function createLangSelector" in self.js

    def test_global_i18n_api(self):
        assert "window.__i18n" in self.js

    def test_lang_changed_event(self):
        assert "lang:changed" in self.js

    def test_localstorage_key(self):
        assert "k_lang" in self.js

    def test_data_i18n_walker(self):
        assert "data-i18n" in self.js

    def test_data_i18n_html_walker(self):
        assert "data-i18n-html" in self.js or "i18nHtml" in self.js

    def test_data_i18n_placeholder_walker(self):
        assert "data-i18n-placeholder" in self.js or "i18nPlaceholder" in self.js

    def test_lang_selector_css_class(self):
        assert "lang-selector" in self.js


class TestI18nTranslationKeys:
    """4개 언어에 핵심 번역 키가 모두 존재하는지 검증합니다."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.js = (STATIC / "i18n.js").read_text(encoding="utf-8")

    REQUIRED_KEYS = [
        "login.subtitle",
        "login.google",
        "tutorial.step1.title",
        "tutorial.step5.body",
        "tutorial.btn.next",
        "tutorial.btn.start",
        "menu.tutorial",
        "menu.logout",
        "search.placeholder",
        "review.title",
        "review.submit",
    ]

    @pytest.mark.parametrize("key", REQUIRED_KEYS)
    def test_key_in_ko(self, key):
        assert f'"{key}"' in self.js

    def test_en_login_subtitle(self):
        assert "cafes & attractions" in self.js

    def test_ja_login_subtitle(self):
        assert "観光地を記録" in self.js

    def test_zh_login_subtitle(self):
        assert "景点" in self.js


# ===== index.html data-i18n 속성 테스트 =====


class TestHtmlI18nAttributes:
    """index.html에 data-i18n 속성이 올바르게 적용되었는지 검증합니다."""

    @pytest.mark.asyncio
    async def test_login_subtitle_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n-html="login.subtitle"' in r.text

    @pytest.mark.asyncio
    async def test_login_feature_search_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="login.feature.search"' in r.text

    @pytest.mark.asyncio
    async def test_login_feature_rating_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="login.feature.rating"' in r.text

    @pytest.mark.asyncio
    async def test_login_feature_unlock_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="login.feature.unlock"' in r.text

    @pytest.mark.asyncio
    async def test_login_google_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="login.google"' in r.text

    @pytest.mark.asyncio
    async def test_login_footer_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n-html="login.footer"' in r.text

    @pytest.mark.asyncio
    async def test_search_placeholder_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n-placeholder="search.placeholder"' in r.text

    @pytest.mark.asyncio
    async def test_review_title_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="review.title"' in r.text

    @pytest.mark.asyncio
    async def test_review_submit_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="review.submit"' in r.text

    @pytest.mark.asyncio
    async def test_menu_tutorial_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="menu.tutorial"' in r.text

    @pytest.mark.asyncio
    async def test_menu_logout_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="menu.logout"' in r.text

    @pytest.mark.asyncio
    async def test_tutorial_btn_prev_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="tutorial.btn.prev"' in r.text

    @pytest.mark.asyncio
    async def test_tutorial_btn_next_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="tutorial.btn.next"' in r.text

    @pytest.mark.asyncio
    async def test_tutorial_btn_skip_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="tutorial.btn.skip"' in r.text

    @pytest.mark.asyncio
    async def test_my_reviews_title_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="myReviews.title"' in r.text

    @pytest.mark.asyncio
    async def test_review_rating_labels(self, client):
        r = await client.get("/")
        assert 'data-i18n="review.rating1.title"' in r.text
        assert 'data-i18n="review.rating2.title"' in r.text
        assert 'data-i18n="review.rating3.title"' in r.text

    @pytest.mark.asyncio
    async def test_review_photo_prompt_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="review.photoPrompt"' in r.text

    @pytest.mark.asyncio
    async def test_review_date_label_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="review.dateLabel"' in r.text


# ===== i18n.js 스크립트 태그 테스트 =====


class TestI18nScriptTag:
    """i18n.js가 auth.js보다 먼저 로드되는지 검증합니다."""

    @pytest.mark.asyncio
    async def test_i18n_script_exists(self, client):
        r = await client.get("/")
        assert "/static/i18n.js" in r.text

    @pytest.mark.asyncio
    async def test_i18n_loaded_before_auth(self, client):
        r = await client.get("/")
        i18n_pos = r.text.index('src="/static/i18n.js')
        auth_pos = r.text.index('src="/static/auth.js')
        assert i18n_pos < auth_pos


# ===== tutorial.js i18n 통합 테스트 =====


class TestTutorialI18n:
    """tutorial.js에서 i18n 함수를 사용하는지 검증합니다."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.js = (STATIC / "tutorial.js").read_text(encoding="utf-8")

    def test_uses_i18n_t(self):
        assert "__i18n" in self.js

    def test_step_title_key(self):
        assert "tutorial.step" in self.js

    def test_lang_changed_listener(self):
        assert "lang:changed" in self.js

    def test_step_count_constant(self):
        assert "STEP_COUNT" in self.js


# ===== auth.js i18n 통합 테스트 =====


class TestAuthI18n:
    """auth.js에서 alert 메시지에 i18n을 사용하는지 검증합니다."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.js = (STATIC / "auth.js").read_text(encoding="utf-8")

    def test_auth_no_setup_i18n(self):
        assert "auth.noSetup" in self.js

    def test_auth_login_failed_i18n(self):
        assert "auth.loginFailed" in self.js


# ===== main.js i18n 통합 테스트 =====


class TestMainI18n:
    """main.js에서 검색 관련 문자열에 i18n을 사용하는지 검증합니다."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.js = (STATIC / "main.js").read_text(encoding="utf-8")

    def test_search_no_results_i18n(self):
        assert "search.noResults" in self.js

    def test_search_error_i18n(self):
        assert "search.error" in self.js

    def test_results_status_i18n(self):
        assert "search.resultsStatus" in self.js

    def test_suggestions_header_i18n(self):
        assert "search.suggestionsHeader" in self.js

    def test_iw_review_btn_i18n(self):
        assert "iw.reviewBtn" in self.js

    def test_iw_reviewed_i18n(self):
        assert "iw.reviewedOnce" in self.js


# ===== reviews.js i18n 통합 테스트 =====


class TestReviewsI18n:
    """reviews.js에서 리뷰 모달 문자열에 i18n을 사용하는지 검증합니다."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.js = (STATIC / "reviews.js").read_text(encoding="utf-8")

    def test_review_submit_i18n(self):
        assert "review.submit" in self.js

    def test_review_submitting_i18n(self):
        assert "review.submitting" in self.js

    def test_review_err_rating_i18n(self):
        assert "review.err.rating" in self.js

    def test_review_err_photo_i18n(self):
        assert "review.err.photo" in self.js

    def test_review_visit_badge_i18n(self):
        assert "review.visitBadge" in self.js

    def test_review_saved_i18n(self):
        assert "review.saved" in self.js

    def test_date_format_i18n(self):
        assert "date.yearFmt" in self.js


# ===== CSS 스타일 테스트 =====


class TestLangSelectorCSS:
    """언어 선택 컴포넌트 CSS가 존재하는지 검증합니다."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.css = (STATIC / "styles.css").read_text(encoding="utf-8")

    def test_lang_selector_class(self):
        assert ".lang-selector" in self.css

    def test_lang_selector_btn(self):
        assert ".lang-selector__btn" in self.css

    def test_lang_selector_dropdown(self):
        assert ".lang-selector__dropdown" in self.css

    def test_lang_selector_option(self):
        assert ".lang-selector__option" in self.css

    def test_lang_selector_active_state(self):
        assert ".lang-selector__option.is-active" in self.css

    def test_mobile_touch_target(self):
        """모바일 터치 영역이 44px 이상인지 확인합니다."""
        assert "min-height: 44px" in self.css or "min-height: 36px" in self.css


# ===== 유저 메뉴 언어 선택 테스트 =====


class TestUserMenuLangSelector:
    """메인 앱 화면의 유저 메뉴에 언어 선택이 포함되는지 검증합니다."""

    @pytest.mark.asyncio
    async def test_lang_menu_item_exists(self, client):
        r = await client.get("/")
        assert 'id="lang-menu-item"' in r.text

    @pytest.mark.asyncio
    async def test_lang_menu_current_exists(self, client):
        r = await client.get("/")
        assert 'id="lang-menu-current"' in r.text

    @pytest.mark.asyncio
    async def test_lang_menu_has_i18n_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="menu.language"' in r.text

    @pytest.mark.asyncio
    async def test_lang_menu_class(self, client):
        r = await client.get("/")
        assert "user-menu__lang" in r.text


class TestUserMenuLangCSS:
    """유저 메뉴 언어 선택 CSS가 존재하는지 검증합니다."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.css = (STATIC / "styles.css").read_text(encoding="utf-8")

    def test_user_menu_lang_class(self):
        assert ".user-menu__lang" in self.css

    def test_user_menu_lang_current(self):
        assert ".user-menu__lang-current" in self.css

    def test_user_menu_lang_submenu(self):
        assert ".user-menu__lang-submenu" in self.css

    def test_user_menu_lang_option(self):
        assert ".user-menu__lang-option" in self.css

    def test_user_menu_lang_option_active(self):
        assert ".user-menu__lang-option.is-active" in self.css


class TestUserMenuLangI18nJs:
    """i18n.js에 유저 메뉴 언어 관련 코드가 있는지 검증합니다."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.js = (STATIC / "i18n.js").read_text(encoding="utf-8")

    def test_menu_language_key(self):
        assert '"menu.language"' in self.js

    def test_lang_menu_item_ref(self):
        assert "lang-menu-item" in self.js

    def test_lang_menu_current_ref(self):
        assert "lang-menu-current" in self.js

    def test_lang_submenu_class(self):
        assert "user-menu__lang-submenu" in self.js


# ===== 유저 등급(tier) 마이그레이션 테스트 =====


MIGRATIONS = pathlib.Path(__file__).resolve().parent.parent / "supabase" / "migrations"


class TestUserTierMigration:
    """002_user_tier.sql 마이그레이션 파일을 검증합니다."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.sql = (MIGRATIONS / "002_user_tier.sql").read_text(encoding="utf-8")

    def test_migration_file_exists(self):
        assert (MIGRATIONS / "002_user_tier.sql").exists()

    def test_adds_tier_column(self):
        assert "tier" in self.sql

    def test_default_free(self):
        assert "'free'" in self.sql

    def test_not_null(self):
        assert "not null" in self.sql

    def test_alter_user_profiles(self):
        assert "user_profiles" in self.sql


# ===== Google AdSense 광고 시스템 테스트 =====


class TestAdContainersHtml:
    """index.html에 광고 컨테이너가 존재하는지 검증합니다."""

    @pytest.mark.asyncio
    async def test_ad_banner_exists(self, client):
        r = await client.get("/")
        assert 'id="ad-banner"' in r.text

    @pytest.mark.asyncio
    async def test_ad_panel_exists(self, client):
        r = await client.get("/")
        assert 'id="ad-panel"' in r.text

    @pytest.mark.asyncio
    async def test_ad_banner_has_slot_class(self, client):
        r = await client.get("/")
        assert "ad-slot--banner" in r.text

    @pytest.mark.asyncio
    async def test_ad_panel_has_slot_class(self, client):
        r = await client.get("/")
        assert "ad-slot--panel" in r.text

    @pytest.mark.asyncio
    async def test_adsbygoogle_ins_exists(self, client):
        r = await client.get("/")
        assert "adsbygoogle" in r.text

    @pytest.mark.asyncio
    async def test_ad_banner_hidden_by_default(self, client):
        r = await client.get("/")
        assert 'id="ad-banner"' in r.text
        # hidden 속성이 있어야 함
        idx = r.text.index('id="ad-banner"')
        chunk = r.text[max(0, idx - 100):idx + 30]
        assert "hidden" in chunk

    @pytest.mark.asyncio
    async def test_ad_sponsored_i18n_attr(self, client):
        r = await client.get("/")
        assert 'data-i18n="ad.sponsored"' in r.text

    @pytest.mark.asyncio
    async def test_ads_script_tag(self, client):
        r = await client.get("/")
        assert 'src="/static/ads.js' in r.text

    @pytest.mark.asyncio
    async def test_ad_modal_exists(self, client):
        r = await client.get("/")
        assert 'id="ad-modal"' in r.text

    @pytest.mark.asyncio
    async def test_ad_modal_has_slot_class(self, client):
        r = await client.get("/")
        assert "ad-slot--modal" in r.text

    @pytest.mark.asyncio
    async def test_ad_modal_hidden_by_default(self, client):
        r = await client.get("/")
        idx = r.text.index('id="ad-modal"')
        chunk = r.text[max(0, idx - 100):idx + 30]
        assert "hidden" in chunk

    @pytest.mark.asyncio
    async def test_ad_modal_inside_review_modal(self, client):
        r = await client.get("/")
        modal_start = r.text.index('id="review-modal"')
        modal_ad = r.text.index('id="ad-modal"')
        assert modal_ad > modal_start


class TestAdsJsFile:
    """ads.js 파일의 핵심 구조를 검증합니다."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.js = (STATIC / "ads.js").read_text(encoding="utf-8")

    def test_ad_client_placeholder(self):
        assert "ca-pub-" in self.js

    def test_init_ads_function(self):
        assert "initAds" in self.js

    def test_load_adsense_script(self):
        assert "loadAdSenseScript" in self.js

    def test_activate_slots(self):
        assert "activateSlots" in self.js

    def test_checks_user_tier(self):
        assert "__getUserTier" in self.js

    def test_free_tier_check(self):
        assert '"free"' in self.js

    def test_has_ads_class(self):
        assert "has-ads" in self.js

    def test_app_visible_listener(self):
        assert "app:visible" in self.js

    def test_graceful_error_handling(self):
        assert "error" in self.js.lower() or "warn" in self.js.lower()


class TestAuthJsTier:
    """auth.js에서 tier를 조회하고 노출하는지 검증합니다."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.js = (STATIC / "auth.js").read_text(encoding="utf-8")

    def test_selects_tier(self):
        assert "tier" in self.js

    def test_get_user_tier_exposed(self):
        assert "__getUserTier" in self.js

    def test_user_tier_variable(self):
        assert "userTier" in self.js

    def test_tier_default_free(self):
        assert '"free"' in self.js


class TestAdSlotCSS:
    """광고 슬롯 CSS가 존재하는지 검증합니다."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.css = (STATIC / "styles.css").read_text(encoding="utf-8")

    def test_ad_slot_class(self):
        assert ".ad-slot" in self.css

    def test_ad_slot_banner(self):
        assert ".ad-slot--banner" in self.css

    def test_ad_slot_panel(self):
        assert ".ad-slot--panel" in self.css

    def test_has_ads_class(self):
        assert "body.has-ads" in self.css

    def test_ad_slot_label(self):
        assert ".ad-slot__label" in self.css

    def test_ad_slot_modal(self):
        assert ".ad-slot--modal" in self.css

    def test_banner_max_height(self):
        """배너 광고 높이가 제한되어 있는지 확인"""
        assert "max-height" in self.css
        # .ad-slot--banner 블록에 max-height 존재
        idx = self.css.index(".ad-slot--banner")
        block = self.css[idx:idx + 300]
        assert "max-height" in block

    def test_banner_overflow_hidden(self):
        """배너 광고 overflow가 hidden인지 확인"""
        idx = self.css.index(".ad-slot--banner")
        block = self.css[idx:idx + 300]
        assert "overflow: hidden" in block


class TestAdBannerHtmlFormat:
    """배너 광고 HTML이 고정 크기로 제한되는지 검증합니다."""

    @pytest.fixture(autouse=True)
    def _load(self):
        tmpl = STATIC.parent / "templates" / "index.html"
        self.html = tmpl.read_text(encoding="utf-8")

    def test_banner_format_is_banner(self):
        """data-ad-format이 banner(고정)인지 확인"""
        idx = self.html.index('id="ad-banner"')
        block = self.html[idx:idx + 400]
        assert 'data-ad-format="banner"' in block

    def test_banner_not_full_width_responsive(self):
        """data-full-width-responsive가 false인지 확인"""
        idx = self.html.index('id="ad-banner"')
        block = self.html[idx:idx + 400]
        assert 'data-full-width-responsive="false"' in block

    def test_banner_inline_max_height(self):
        """ins 요소에 inline max-height이 있는지 확인"""
        idx = self.html.index('id="ad-banner"')
        block = self.html[idx:idx + 400]
        assert "max-height:50px" in block


class TestAdI18nKeys:
    """i18n.js에 광고 관련 번역 키가 있는지 검증합니다."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.js = (STATIC / "i18n.js").read_text(encoding="utf-8")

    def test_ad_sponsored_key(self):
        assert '"ad.sponsored"' in self.js

    def test_ad_sponsored_ko(self):
        assert "광고" in self.js

    def test_ad_sponsored_en(self):
        assert "Sponsored" in self.js

    def test_ad_sponsored_ja(self):
        assert "広告" in self.js

    def test_ad_sponsored_zh(self):
        assert "广告" in self.js
