"""AdapterRegistry for managing and routing typed sensor adapters."""

from typing import Type
from app.core.logging import get_logger
from app.ingestion.base import BaseSensorAdapter
from app.schemas.sensors import SensorGroupId, SensorModality, MODALITY_TO_GROUP

logger = get_logger("adapter_registry")


class AdapterRegistry:
    """Central registry of sensor adapters capable of registering all 8 modalities."""

    def __init__(self) -> None:
        self._adapters_by_sensor_id: dict[str, BaseSensorAdapter] = {}
        self._adapter_classes_by_modality: dict[SensorModality, Type[BaseSensorAdapter]] = {}

    def register_adapter_class(
        self, modality: SensorModality, adapter_cls: Type[BaseSensorAdapter]
    ) -> None:
        """Registers an adapter class for a given sensor modality."""
        self._adapter_classes_by_modality[modality] = adapter_cls
        logger.info("Registered adapter class %s for modality %s", adapter_cls.__name__, modality.value)

    def register_adapter_instance(self, adapter: BaseSensorAdapter) -> None:
        """Registers a concrete sensor adapter instance by sensor_id."""
        self._adapters_by_sensor_id[adapter.sensor_id] = adapter
        logger.info("Registered sensor adapter instance '%s' (modality: %s)", adapter.sensor_id, adapter.modality.value)

    def get_adapter_instance(self, sensor_id: str) -> BaseSensorAdapter | None:
        """Retrieves a registered sensor adapter instance by sensor_id."""
        return self._adapters_by_sensor_id.get(sensor_id)

    def get_adapter_class(self, modality: SensorModality) -> Type[BaseSensorAdapter] | None:
        """Retrieves registered adapter class for a modality."""
        return self._adapter_classes_by_modality.get(modality)

    def get_adapters_by_group(self, group: SensorGroupId) -> list[BaseSensorAdapter]:
        """Retrieves all active adapter instances belonging to an evidence group."""
        return [adapter for adapter in self._adapters_by_sensor_id.values() if adapter.group == group]

    def list_registered_modalities(self) -> list[SensorModality]:
        """Lists all modalities that have registered adapter classes or instances."""
        modalities = set(self._adapter_classes_by_modality.keys())
        modalities.update(a.modality for a in self._adapters_by_sensor_id.values())
        return sorted(list(modalities), key=lambda m: m.value)

    def list_all_sensor_ids(self) -> list[str]:
        """Lists all registered sensor IDs."""
        return list(self._adapters_by_sensor_id.keys())

    def clear(self) -> None:
        """Clears all registered adapters (useful in tests)."""
        self._adapters_by_sensor_id.clear()
        self._adapter_classes_by_modality.clear()


_global_adapter_registry: AdapterRegistry | None = None


def get_adapter_registry() -> AdapterRegistry:
    """Returns the global singleton AdapterRegistry."""
    global _global_adapter_registry
    if _global_adapter_registry is None:
        _global_adapter_registry = AdapterRegistry()
    return _global_adapter_registry
