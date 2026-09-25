"""API tests for truthful health check endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint_truthful_response(async_client: AsyncClient):
    """Verify /api/v1/health truthfully reports subsystem statuses."""
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] in ["healthy", "degraded"]
    assert data["service"] == "beacon-insight-backend"
    assert data["version"] == "0.1.0"
    assert data["mode"] == "synthetic"
    # Truthful reporting of unconfigured services
    assert data["database"] in ["not_configured", "connected"]
    assert data["event_bus"] in ["not_configured", "connected"]
    assert data["inference"] == "not_initialized"


@pytest.mark.asyncio
async def test_health_live_endpoint(async_client: AsyncClient):
    """Verify /api/v1/health/live returns 200 alive."""
    response = await async_client.get("/api/v1/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data == {"status": "alive"}


@pytest.mark.asyncio
async def test_health_ready_endpoint(async_client: AsyncClient):
    """Verify /api/v1/health/ready returns 200 when service is ready."""
    response = await async_client.get("/api/v1/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"


@pytest.mark.asyncio
async def test_root_endpoint(async_client: AsyncClient):
    """Verify root endpoint provides service identity and link to health."""
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "beacon-insight-backend"
    assert "/api/v1/health" in data["health_url"]
