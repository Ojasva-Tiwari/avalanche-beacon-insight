"""API v1 endpoints package."""

from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.system import router as system_router

__all__ = ["health_router", "system_router"]
