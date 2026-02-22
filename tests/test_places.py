from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import HTTPStatusError, Request, Response

from app.services.kakao import KakaoPlacesClient, get_kakao_client


FAKE_KAKAO_RESPONSE = {
    "documents": [
        {
            "place_name": "서울역",
            "x": "126.972559",
            "y": "37.555946",
        }
    ],
    "meta": {"total_count": 1},
}


@pytest.mark.asyncio
async def test_search_places_success(app, client):
    """정상 검색 시 카카오 API 응답을 그대로 프록시합니다."""
    mock_kakao = AsyncMock(spec=KakaoPlacesClient)
    mock_kakao.search_keyword.return_value = FAKE_KAKAO_RESPONSE

    app.dependency_overrides[get_kakao_client] = lambda: mock_kakao

    response = await client.get("/api/places", params={"query": "서울역"})
    assert response.status_code == 200
    data = response.json()
    assert data["documents"][0]["place_name"] == "서울역"
    mock_kakao.search_keyword.assert_awaited_once_with("서울역")


@pytest.mark.asyncio
async def test_search_places_missing_query(client):
    """query 파라미터가 없으면 422를 반환합니다."""
    response = await client.get("/api/places")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_search_places_empty_query(client):
    """빈 query는 422를 반환합니다."""
    response = await client.get("/api/places", params={"query": ""})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_search_places_kakao_error_returns_502(app, client):
    """카카오 API 오류 시 502를 반환합니다."""
    mock_kakao = AsyncMock(spec=KakaoPlacesClient)
    mock_kakao.search_keyword.side_effect = HTTPStatusError(
        "Bad Gateway",
        request=Request("GET", "https://dapi.kakao.com"),
        response=Response(502),
    )

    app.dependency_overrides[get_kakao_client] = lambda: mock_kakao

    response = await client.get("/api/places", params={"query": "서울역"})
    assert response.status_code == 502
    assert "Kakao API error" in response.json()["detail"]


@pytest.mark.asyncio
async def test_search_places_multiple_results(app, client):
    """다건 결과가 올바르게 반환됩니다."""
    multi_response = {
        "documents": [
            {"place_name": "스타벅스 강남점", "x": "127.0", "y": "37.5"},
            {"place_name": "스타벅스 역삼점", "x": "127.1", "y": "37.6"},
            {"place_name": "스타벅스 선릉점", "x": "127.2", "y": "37.7"},
        ],
        "meta": {"total_count": 3},
    }
    mock_kakao = AsyncMock(spec=KakaoPlacesClient)
    mock_kakao.search_keyword.return_value = multi_response

    app.dependency_overrides[get_kakao_client] = lambda: mock_kakao

    response = await client.get("/api/places", params={"query": "스타벅스"})
    assert response.status_code == 200
    assert len(response.json()["documents"]) == 3


@pytest.mark.asyncio
async def test_search_places_unicode_query(app, client):
    """한글/유니코드 쿼리가 정상 처리됩니다."""
    mock_kakao = AsyncMock(spec=KakaoPlacesClient)
    mock_kakao.search_keyword.return_value = {
        "documents": [{"place_name": "제주 올레길"}],
        "meta": {"total_count": 1},
    }

    app.dependency_overrides[get_kakao_client] = lambda: mock_kakao

    response = await client.get("/api/places", params={"query": "제주 올레길"})
    assert response.status_code == 200
    assert response.json()["documents"][0]["place_name"] == "제주 올레길"
    mock_kakao.search_keyword.assert_awaited_once_with("제주 올레길")


@pytest.mark.asyncio
async def test_search_places_empty_documents(app, client):
    """카카오 API가 빈 documents를 반환해도 200입니다."""
    mock_kakao = AsyncMock(spec=KakaoPlacesClient)
    mock_kakao.search_keyword.return_value = {
        "documents": [],
        "meta": {"total_count": 0},
    }

    app.dependency_overrides[get_kakao_client] = lambda: mock_kakao

    response = await client.get("/api/places", params={"query": "asdfjkl"})
    assert response.status_code == 200
    assert response.json()["documents"] == []


class TestGetKakaoClient:
    """get_kakao_client 팩토리 테스트."""

    def test_returns_kakao_client_instance(self):
        client_instance = get_kakao_client()
        assert isinstance(client_instance, KakaoPlacesClient)

    def test_client_has_correct_rest_key(self):
        client_instance = get_kakao_client()
        assert client_instance._rest_key == "test_rest_key"

    def test_client_has_correct_base_url(self):
        client_instance = get_kakao_client()
        assert "keyword.json" in client_instance._base_url

    def test_client_has_correct_timeout(self):
        client_instance = get_kakao_client()
        assert client_instance._timeout == 7.0


class TestKakaoPlacesClient:
    """KakaoPlacesClient 단위 테스트."""

    @pytest.mark.asyncio
    async def test_search_keyword_sends_correct_headers(self):
        """REST 키가 Authorization 헤더에 올바르게 포함됩니다."""
        client_instance = KakaoPlacesClient(
            rest_key="my_rest_key",
            base_url="https://dapi.kakao.com/v2/local/search/keyword.json",
            timeout=5.0,
        )

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = FAKE_KAKAO_RESPONSE
        mock_response.raise_for_status = MagicMock()

        captured = {}

        async def mock_get(url, headers=None, params=None):
            captured["headers"] = headers
            captured["params"] = params
            return mock_response

        with patch("httpx.AsyncClient") as MockAsyncClient:
            mock_ac = AsyncMock()
            mock_ac.get = mock_get
            mock_ac.__aenter__ = AsyncMock(return_value=mock_ac)
            mock_ac.__aexit__ = AsyncMock(return_value=False)
            MockAsyncClient.return_value = mock_ac

            result = await client_instance.search_keyword("테스트")

        assert captured["headers"]["Authorization"] == "KakaoAK my_rest_key"
        assert captured["params"]["query"] == "테스트"
        assert result == FAKE_KAKAO_RESPONSE

    @pytest.mark.asyncio
    async def test_search_keyword_propagates_http_error(self):
        """서버 에러 응답 시 HTTPStatusError가 전파됩니다."""
        client_instance = KakaoPlacesClient(
            rest_key="key", base_url="https://example.com", timeout=5.0,
        )

        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.raise_for_status.side_effect = HTTPStatusError(
            "Unauthorized",
            request=Request("GET", "https://example.com"),
            response=Response(401),
        )

        async def mock_get(url, headers=None, params=None):
            return mock_response

        with patch("httpx.AsyncClient") as MockAsyncClient:
            mock_ac = AsyncMock()
            mock_ac.get = mock_get
            mock_ac.__aenter__ = AsyncMock(return_value=mock_ac)
            mock_ac.__aexit__ = AsyncMock(return_value=False)
            MockAsyncClient.return_value = mock_ac

            with pytest.raises(HTTPStatusError):
                await client_instance.search_keyword("test")

    @pytest.mark.asyncio
    async def test_search_keyword_passes_timeout(self):
        """생성 시 전달한 timeout이 AsyncClient에 전달됩니다."""
        client_instance = KakaoPlacesClient(
            rest_key="key", base_url="https://example.com", timeout=3.0,
        )

        mock_response = MagicMock()
        mock_response.json.return_value = {}
        mock_response.raise_for_status = MagicMock()

        captured_timeout = {}

        async def mock_get(url, headers=None, params=None):
            return mock_response

        with patch("httpx.AsyncClient") as MockAsyncClient:
            def capture_init(*args, **kwargs):
                captured_timeout["value"] = kwargs.get("timeout")
                mock_ac = AsyncMock()
                mock_ac.get = mock_get
                mock_ac.__aenter__ = AsyncMock(return_value=mock_ac)
                mock_ac.__aexit__ = AsyncMock(return_value=False)
                return mock_ac

            MockAsyncClient.side_effect = capture_init

            await client_instance.search_keyword("test")

        assert captured_timeout["value"] == 3.0
