"""BaseSensorAdapter abstract base class for typed sensor ingestion."""

from abc import ABC, abstractmethod
from typing import Any

from app.schemas.sensors import SensorGroupId, SensorModality, SensorQuality, SensorState, MODALITY_TO_GROUP
from app.schemas.telemetry import ObservationEnvelope


class BaseSensorAdapter(ABC):
    """Abstract base class that every sensor modality adapter must implement.

    Pipeline path:
    Raw bytes/dict -> parse_raw() -> validate() -> normalize() -> evaluate_quality() -> health()
    """

    def __init__(self, sensor_id: str, modality: SensorModality, label: str = "") -> None:
        self.sensor_id = sensor_id
        self.modality = modality
        self.label = label or f"{modality.value} Sensor ({sensor_id})"
        self.group: SensorGroupId = MODALITY_TO_GROUP[modality]
        self._state: SensorState = SensorState.ACTIVE

    @abstractmethod
    def parse_raw(self, raw_input: bytes | dict[str, Any]) -> dict[str, Any]:
        """Parses raw physical/synthetic wire payload into structured dictionary."""
        raise NotImplementedError

    @abstractmethod
    def validate(self, payload: dict[str, Any]) -> tuple[bool, str | None]:
        """Validates payload schema, value bounds, and checksum.
        
        Returns:
            (is_valid, error_or_quarantine_reason)
        """
        raise NotImplementedError

    @abstractmethod
    def normalize(self, payload: dict[str, Any]) -> ObservationEnvelope:
        """Transforms validated payload into canonical ObservationEnvelope."""
        raise NotImplementedError

    @abstractmethod
    def evaluate_quality(self, payload: dict[str, Any]) -> SensorQuality:
        """Evaluates SNR, interference, and environmental degradation factors."""
        raise NotImplementedError

    def health(self) -> SensorState:
        """Returns the current operational health state of the sensor."""
        return self._state

    def set_state(self, state: SensorState) -> None:
        """Sets sensor operational state (for degradation / fault injection)."""
        self._state = state
