"""Unit tests for BaseSensorAdapter and AdapterRegistry."""

from typing import Any
import pytest

from app.ingestion.base import BaseSensorAdapter
from app.ingestion.registry import AdapterRegistry
from app.schemas.domain import DecisionDataMode, GeoPoint
from app.schemas.sensors import SensorGroupId, SensorModality, SensorQuality, SensorState
from app.schemas.telemetry import ObservationEnvelope


class MockRfAdapter(BaseSensorAdapter):
    """Mock implementation of BaseSensorAdapter for testing."""

    def __init__(self, sensor_id: str = "mock_rf_1") -> None:
        super().__init__(sensor_id=sensor_id, modality=SensorModality.RF, label="Mock RF Transceiver")

    def parse_raw(self, raw_input: bytes | dict[str, Any]) -> dict[str, Any]:
        if isinstance(raw_input, bytes):
            return {"rssi": -65, "frequency_khz": 457}
        return raw_input

    def validate(self, payload: dict[str, Any]) -> tuple[bool, str | None]:
        if "rssi" not in payload:
            return False, "MISSING_RSSI"
        return True, None

    def normalize(self, payload: dict[str, Any]) -> ObservationEnvelope:
        rssi = payload.get("rssi", -100)
        norm_val = min(1.0, max(0.0, (rssi + 100) / 70.0))
        return ObservationEnvelope(
            observation_id=f"obs-{self.sensor_id}",
            incident_id="inc-test",
            sensor_id=self.sensor_id,
            modality=self.modality,
            position=GeoPoint(latitude=34.12, longitude=74.38),
            normalized_measurement=round(norm_val, 3),
            quality=self.evaluate_quality(payload),
            data_mode=DecisionDataMode.SYNTHETIC,
        )

    def evaluate_quality(self, payload: dict[str, Any]) -> SensorQuality:
        return SensorQuality(signal_quality=0.9, environmental_quality=0.85, interference=0.05)


def test_base_sensor_adapter_interface():
    """Verify BaseSensorAdapter lifecycle and state mutation."""
    adapter = MockRfAdapter("rf_01")
    assert adapter.sensor_id == "rf_01"
    assert adapter.modality == SensorModality.RF
    assert adapter.group == SensorGroupId.GROUP_A_ELECTRONIC
    assert adapter.health() == SensorState.ACTIVE

    # State degradation
    adapter.set_state(SensorState.DEGRADED)
    assert adapter.health() == SensorState.DEGRADED

    # Ingestion flow
    raw = b"\x01\x02"
    parsed = adapter.parse_raw(raw)
    assert parsed["frequency_khz"] == 457

    valid, reason = adapter.validate(parsed)
    assert valid is True
    assert reason is None

    env = adapter.normalize(parsed)
    assert env.modality == SensorModality.RF
    assert env.normalized_measurement is not None


def test_adapter_registry_registration_and_lookup():
    """Verify AdapterRegistry registration across all modalities and evidence groups."""
    registry = AdapterRegistry()

    # Register mock adapter instance
    rf_adapter = MockRfAdapter("rf_alpha")
    registry.register_adapter_instance(rf_adapter)

    retrieved = registry.get_adapter_instance("rf_alpha")
    assert retrieved is not None
    assert retrieved.sensor_id == "rf_alpha"
    assert retrieved.group == SensorGroupId.GROUP_A_ELECTRONIC

    # Register by class
    registry.register_adapter_class(SensorModality.RF, MockRfAdapter)
    retrieved_cls = registry.get_adapter_class(SensorModality.RF)
    assert retrieved_cls is MockRfAdapter

    # Group retrieval
    group_a_adapters = registry.get_adapters_by_group(SensorGroupId.GROUP_A_ELECTRONIC)
    assert len(group_a_adapters) == 1
    assert group_a_adapters[0].sensor_id == "rf_alpha"

    # Non-existent lookups
    assert registry.get_adapter_instance("non_existent") is None
    assert registry.get_adapter_class(SensorModality.GPR) is None
