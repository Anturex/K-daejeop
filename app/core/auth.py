"""Supabase JWT 토큰 검증 유틸리티.

프론트엔드에서 Supabase JS SDK가 발급한 access_token을
Authorization: Bearer <token> 헤더로 보내면,
이 모듈이 JWT를 검증하고 유저 정보를 추출합니다.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

# Bearer 토큰 자동 추출 (auto_error=False → 토큰 없으면 None 반환)
_bearer_scheme = HTTPBearer(auto_error=False)


def verify_supabase_token(token: str) -> Dict[str, Any]:
    """Supabase JWT를 검증하고 payload를 반환합니다.

    Raises:
        HTTPException(401): 토큰이 유효하지 않거나 만료된 경우.
    """
    settings = get_settings()

    if not settings.supabase_jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_JWT_SECRET is not configured",
        )

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Dict[str, Any]:
    """FastAPI 의존성: Authorization 헤더에서 유저 정보를 추출합니다.

    Usage:
        @router.get("/protected")
        async def protected(user: dict = Depends(get_current_user)):
            return {"email": user.get("email")}
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_supabase_token(credentials.credentials)
    return payload


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Optional[Dict[str, Any]]:
    """FastAPI 의존성: 로그인했으면 유저 정보, 아니면 None을 반환합니다."""
    if credentials is None:
        return None

    try:
        return verify_supabase_token(credentials.credentials)
    except HTTPException:
        return None
