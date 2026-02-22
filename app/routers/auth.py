"""인증 관련 API 엔드포인트."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me")
async def me(user: Dict[str, Any] = Depends(get_current_user)):
    """현재 로그인한 유저 정보를 반환합니다.

    Supabase JWT payload에서 추출한 정보:
    - sub: 유저 UUID
    - email: 이메일
    - user_metadata: Google 프로필 정보 (이름, 아바타 등)
    """
    metadata = user.get("user_metadata", {})
    return {
        "id": user.get("sub"),
        "email": user.get("email"),
        "name": metadata.get("full_name") or metadata.get("name", ""),
        "avatar_url": metadata.get("avatar_url") or metadata.get("picture", ""),
    }
