from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_health_check_returns_ok(client):
    """GET /api/health 가 200 + {"status": "ok"} 를 반환합니다."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
