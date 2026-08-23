"""SQLAlchemy 2.x async engine, session management, and connectivity verification."""

from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("database")

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine | None:
    """Returns or lazily creates the async SQLAlchemy engine."""
    global _engine
    settings = get_settings()

    if not settings.DATABASE_URL:
        return None

    if _engine is None:
        # Convert standard postgresql:// to postgresql+asyncpg:// if needed
        db_url = settings.DATABASE_URL
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

        _engine = create_async_engine(
            db_url,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            echo=settings.DB_ECHO,
            future=True,
        )
        logger.info("Initialized async SQLAlchemy engine for %s", db_url.split("@")[-1] if "@" in db_url else "database")

    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession] | None:
    """Returns the async session factory."""
    global _session_factory
    engine = get_engine()
    if engine is None:
        return None

    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _session_factory


async def get_db() -> AsyncGenerator[AsyncSession | None, None]:
    """FastAPI dependency for yielding database sessions."""
    factory = get_session_factory()
    if factory is None:
        yield None
        return

    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception as exc:
            await session.rollback()
            logger.error("Database session transaction rolled back: %s", exc)
            raise


async def check_db_connectivity() -> bool:
    """Truthfully checks whether the database is configured and reachable."""
    engine = get_engine()
    if engine is None:
        return False

    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            return result.scalar() == 1
    except Exception as exc:
        logger.warning("Database connectivity check failed: %s", exc)
        return False
