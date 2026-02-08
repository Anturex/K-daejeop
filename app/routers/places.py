from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from httpx import HTTPError

from app.services.kakao import KakaoPlacesClient, get_kakao_client

router = APIRouter(prefix="/api/places", tags=["places"])


@router.get("")
async def search_places(
    query: str = Query(..., min_length=1),
    kakao: KakaoPlacesClient = Depends(get_kakao_client),
):
    try:
        return await kakao.search_keyword(query)
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail="Kakao API error") from exc
