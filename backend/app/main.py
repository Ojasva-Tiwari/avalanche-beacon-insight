"""FastAPI application entrypoint for Avalanche Beacon Insight."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.core.config import get_settings
from app.core.config_loader import get_config_manager
from app.core.logging import get_logger, setup_logging
from app.core.version import VERSION
from app.events.bus import get_event_bus

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown lifespan context."""
    settings = get_settings()
    setup_logging(settings.LOG_LEVEL)
    logger.info("Starting %s v%s (environment: %s, mode: %s)", settings.SERVICE_NAME, VERSION, settings.ENVIRONMENT, settings.DATA_MODE)

    # 1. Load versioned configuration sources
    config_mgr = get_config_manager()
    logger.info("Loaded %d configuration files with verified checksums", len(config_mgr.get_all_metadata()))

    # 2. Connect to NATS JetStream event bus if configured
    event_bus = get_event_bus()
    if event_bus.is_configured:
        await event_bus.connect()

    yield

    # Shutdown sequence
    logger.info("Shutting down %s", settings.SERVICE_NAME)
    if event_bus.is_configured:
        await event_bus.disconnect()


def create_application() -> FastAPI:
    """Factory creating and configuring the FastAPI application instance."""
    settings = get_settings()

    application = FastAPI(
        title="Avalanche Beacon Insight Backend",
        description="Mission backend foundation for SAR decision support and multi-modal sensor fusion",
        version=VERSION,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # CORS configuration
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount API v1 router
    application.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    @application.get("/", tags=["Root"])
    async def root() -> dict[str, str]:
        """Root endpoint returning service identity and health link."""
        return {
            "service": settings.SERVICE_NAME,
            "version": VERSION,
            "status": "online",
            "health_url": f"{settings.API_V1_PREFIX}/health",
        }

    return application


app = create_application()
