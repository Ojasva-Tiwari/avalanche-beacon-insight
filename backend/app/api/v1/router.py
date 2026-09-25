"""Master router for API v1 aggregating all domain and infrastructure endpoints."""

from fastapi import APIRouter

from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.system import router as system_router

api_v1_router = APIRouter()

api_v1_router.include_router(health_router)
api_v1_router.include_router(system_router)
