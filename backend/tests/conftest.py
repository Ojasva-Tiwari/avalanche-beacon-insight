"""Pytest configuration, fixtures, and async HTTP test client."""

import os
from typing import AsyncGenerator
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings, get_settings
from app.core.config_loader import ConfigurationManager
from app.ingestion.registry import AdapterRegistry
from app.main import app


@pytest.fixture(autouse=True)
def reset_singletons():
    """Ensure clean state across tests."""
    yield


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Provides an async HTTP test client for testing FastAPI endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
