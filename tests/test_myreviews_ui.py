"""내 맛집 UI 테스트 — React 마이그레이션 이후 프론트엔드 UI 테스트는
frontend/tests/ 의 Vitest + React Testing Library 에서 수행됩니다.

이 파일은 서버사이드에서 검증 가능한 항목만 유지합니다."""
from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_spa_serves_react_app(client):
    """GET / 가 React SPA를 반환합니다."""
    response = await client.get("/")
    assert response.status_code == 200
    assert 'id="root"' in response.text
