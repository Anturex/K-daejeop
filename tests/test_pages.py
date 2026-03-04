from __future__ import annotations

import os
from unittest.mock import patch

import pytest


@pytest.mark.asyncio
async def test_index_returns_html(client):
    """GET / 가 HTML을 반환하며 카카오 SDK URL이 포함됩니다."""
    response = await client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    body = response.text
    assert "K-daejeop" in body
    assert "kakao" in body.lower()


@pytest.mark.asyncio
async def test_index_contains_kakao_js_key(client):
    """렌더링된 HTML에 카카오 JS 키가 포함됩니다."""
    response = await client.get("/")
    assert "test_js_key" in response.text


@pytest.mark.asyncio
async def test_index_fails_without_kakao_js_key(client):
    """KAKAO_JS_KEY가 비어있으면 500을 반환합니다."""
    from app.core.config import get_settings

    get_settings.cache_clear()
    with patch.dict(os.environ, {"KAKAO_JS_KEY": ""}):
        get_settings.cache_clear()
        response = await client.get("/")
        assert response.status_code == 500


@pytest.mark.asyncio
async def test_index_contains_suggestions_container(client):
    """HTML에 자동완성 드롭다운 컨테이너가 포함됩니다."""
    response = await client.get("/")
    body = response.text
    assert 'id="suggestions"' in body
    assert 'role="listbox"' in body


@pytest.mark.asyncio
async def test_index_contains_no_results_toast(client):
    """HTML에 검색 결과 없음 토스트가 포함됩니다."""
    response = await client.get("/")
    body = response.text
    assert 'id="no-results"' in body


@pytest.mark.asyncio
async def test_index_loads_google_fonts(client):
    """HTML에 Google Fonts 링크가 포함됩니다."""
    response = await client.get("/")
    assert "fonts.googleapis.com" in response.text


@pytest.mark.asyncio
async def test_index_loads_noto_serif_kr(client):
    """HTML에 Noto Serif KR 폰트가 로드됩니다."""
    response = await client.get("/")
    assert "Noto+Serif+KR" in response.text


@pytest.mark.asyncio
async def test_index_loads_noto_sans_kr(client):
    """HTML에 Noto Sans KR 폰트가 로드됩니다."""
    response = await client.get("/")
    assert "Noto+Sans+KR" in response.text


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
async def test_index_contains_search_input(client):
    """HTML에 검색 입력 필드가 포함됩니다."""
    response = await client.get("/")
    body = response.text
    assert 'id="search-input"' in body
    assert 'id="search-button"' in body


@pytest.mark.asyncio
async def test_index_static_files_have_cache_buster(client):
    """정적 파일(CSS, JS) URL에 캐시 버스터 쿼리 파라미터가 포함됩니다."""
    import re

    response = await client.get("/")
    body = response.text
    # styles.css?v=<숫자>
    assert re.search(r'styles\.css\?v=\d+', body), "CSS에 캐시 버스터 없음"
    # main.js?v=<숫자>
    assert re.search(r'main\.js\?v=\d+', body), "JS에 캐시 버스터 없음"


# ===== 이용약관 / 개인정보처리방침 모달 테스트 =====


@pytest.mark.asyncio
async def test_terms_modal_exists(client):
    """이용약관 모달 컨테이너가 존재합니다."""
    r = await client.get("/")
    assert 'id="terms-modal"' in r.text


@pytest.mark.asyncio
async def test_privacy_modal_exists(client):
    """개인정보처리방침 모달 컨테이너가 존재합니다."""
    r = await client.get("/")
    assert 'id="privacy-modal"' in r.text


@pytest.mark.asyncio
async def test_terms_modal_hidden_by_default(client):
    """이용약관 모달이 기본적으로 hidden 상태입니다."""
    r = await client.get("/")
    idx = r.text.index('id="terms-modal"')
    # hidden 속성은 같은 태그 내에 존재 (앞뒤 탐색)
    tag_start = r.text.rfind("<", 0, idx)
    tag_end = r.text.index(">", idx)
    tag = r.text[tag_start:tag_end + 1]
    assert "hidden" in tag


@pytest.mark.asyncio
async def test_privacy_modal_hidden_by_default(client):
    """개인정보처리방침 모달이 기본적으로 hidden 상태입니다."""
    r = await client.get("/")
    idx = r.text.index('id="privacy-modal"')
    tag_start = r.text.rfind("<", 0, idx)
    tag_end = r.text.index(">", idx)
    tag = r.text[tag_start:tag_end + 1]
    assert "hidden" in tag


@pytest.mark.asyncio
async def test_login_footer_links_to_terms(client):
    """로그인 footer에서 이용약관 링크가 #terms를 가리킵니다."""
    r = await client.get("/")
    assert 'href="#terms"' in r.text


@pytest.mark.asyncio
async def test_login_footer_links_to_privacy(client):
    """로그인 footer에서 개인정보처리방침 링크가 #privacy를 가리킵니다."""
    r = await client.get("/")
    assert 'href="#privacy"' in r.text


@pytest.mark.asyncio
async def test_terms_modal_has_close_button(client):
    """이용약관 모달에 닫기 버튼이 있습니다."""
    r = await client.get("/")
    idx = r.text.index('id="terms-modal"')
    block = r.text[idx:idx + 500]
    assert "legal-modal__close" in block


@pytest.mark.asyncio
async def test_terms_modal_content_license(client):
    """이용약관에 콘텐츠 이용 허락 조항이 포함됩니다."""
    r = await client.get("/")
    assert "콘텐츠 이용 허락" in r.text
