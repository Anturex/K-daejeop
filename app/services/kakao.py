from __future__ import annotations

from typing import Any, Dict

import httpx

from app.core.config import get_settings


class KakaoPlacesClient:
    def __init__(self, rest_key: str, base_url: str, timeout: float) -> None:
        self._rest_key = rest_key
        self._base_url = base_url
        self._timeout = timeout

    async def search_keyword(self, query: str) -> Dict[str, Any]:
        headers = {"Authorization": f"KakaoAK {self._rest_key}"}
        params = {"query": query}
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(self._base_url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()


def get_kakao_client() -> KakaoPlacesClient:
    settings = get_settings()
    return KakaoPlacesClient(
        rest_key=settings.kakao_rest_key,
        base_url=settings.kakao_places_url,
        timeout=settings.kakao_request_timeout,
    )
