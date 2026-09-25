"""Sensor ingestion and typed adapter registry package."""

from app.ingestion.base import BaseSensorAdapter
from app.ingestion.registry import AdapterRegistry, get_adapter_registry

__all__ = [
    "BaseSensorAdapter",
    "AdapterRegistry",
    "get_adapter_registry",
]
