"""Truthful health check endpoints for liveness, readiness, and subsystem status."""

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.version import VERSION
from app.db.session import check_db_connectivity
from app.events.bus import get_event_bus
from app.schemas.domain import HealthStatus

router = APIRouter(prefix="/health", tags=["Health"])


@router.get(
    "",
    response_model=HealthStatus,
    summary="Comprehensive system health status",
    description="Truthfully reports connectivity to database, event bus, and inference engine.",
)
async def get_health() -> HealthStatus:
    """Returns comprehensive truthful health status of all backend subsystems."""
    settings = get_settings()

    # 1. Database status
    if not settings.DATABASE_URL:
        db_status = "not_configured"
    else:
        is_db_connected = await check_db_connectivity()
        db_status = "connected" if is_db_connected else "error"

    # 2. Event bus status
    event_bus = get_event_bus()
    if not event_bus.is_configured:
        event_bus_status = "not_configured"
    else:
        is_bus_connected = await event_bus.check_health()
        event_bus_status = "connected" if is_bus_connected else "error"

    # 3. Inference engine status (Milestone 1 foundation only)
    inference_status = "not_initialized"

    # Overall status determination
    is_healthy = db_status != "error" and event_bus_status != "error"
    overall_status = "healthy" if is_healthy else "degraded"

    return HealthStatus(
        status=overall_status,
        service=settings.SERVICE_NAME,
        version=VERSION,
        mode=settings.DATA_MODE,
        database=db_status,
        event_bus=event_bus_status,
        inference=inference_status,
    )


@router.get(
    "/live",
    summary="Process liveness probe",
    description="Kubernetes / Docker liveness probe returning HTTP 200 if process is running.",
)
async def liveness_probe() -> dict[str, str]:
    """Returns HTTP 200 to indicate process liveness."""
    return {"status": "alive"}


@router.get(
    "/ready",
    summary="Subsystem readiness probe",
    description="Kubernetes / Docker readiness probe checking required configured dependencies.",
)
async def readiness_probe() -> JSONResponse:
    """Checks whether the service is ready to accept traffic."""
    settings = get_settings()
    is_ready = True
    errors: list[str] = []

    # If database is explicitly configured, it must be reachable for readiness
    if settings.DATABASE_URL:
        db_ok = await check_db_connectivity()
        if not db_ok:
            is_ready = False
            errors.append("Database is configured but unreachable")

    # If NATS is explicitly configured, it must be reachable for readiness
    event_bus = get_event_bus()
    if event_bus.is_configured:
        bus_ok = await event_bus.check_health()
        if not bus_ok:
            is_ready = False
            errors.append("Event bus (NATS) is configured but unreachable")

    if is_ready:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "ready", "service": settings.SERVICE_NAME, "version": VERSION},
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "errors": errors},
        )
