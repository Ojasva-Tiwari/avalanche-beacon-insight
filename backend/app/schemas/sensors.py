"""Sensor domain types, modalities, states, and evidence schemas."""

from enum import Enum
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class SensorModality(str, Enum):
    """The 8 supported sensor modalities."""
    RF = "RF"
    RECCO = "RECCO"
    MOBILE_RF = "MOBILE_RF"
    GPR = "GPR"
    SEISMIC = "SEISMIC"
    ACOUSTIC = "ACOUSTIC"
    THERMAL = "THERMAL"
    RGB = "RGB"


class SensorGroupId(str, Enum):
    """The 3 independent evidence groups for log-odds fusion."""
    GROUP_A_ELECTRONIC = "GROUP_A_ELECTRONIC"
    GROUP_B_SUBSURFACE = "GROUP_B_SUBSURFACE"
    GROUP_C_SURFACE = "GROUP_C_SURFACE"


# Mapping from modality to evidence group
MODALITY_TO_GROUP: dict[SensorModality, SensorGroupId] = {
    SensorModality.RF: SensorGroupId.GROUP_A_ELECTRONIC,
    SensorModality.RECCO: SensorGroupId.GROUP_A_ELECTRONIC,
    SensorModality.MOBILE_RF: SensorGroupId.GROUP_A_ELECTRONIC,
    SensorModality.GPR: SensorGroupId.GROUP_B_SUBSURFACE,
    SensorModality.SEISMIC: SensorGroupId.GROUP_B_SUBSURFACE,
    SensorModality.ACOUSTIC: SensorGroupId.GROUP_B_SUBSURFACE,
    SensorModality.THERMAL: SensorGroupId.GROUP_C_SURFACE,
    SensorModality.RGB: SensorGroupId.GROUP_C_SURFACE,
}


class SensorState(str, Enum):
    """Sensor operational health states."""
    ACTIVE = "ACTIVE"
    DEGRADED = "DEGRADED"
    OFFLINE = "OFFLINE"
    UNAVAILABLE = "UNAVAILABLE"


class VisibilityCondition(str, Enum):
    """Environmental visibility."""
    GOOD = "GOOD"
    MODERATE = "MODERATE"
    POOR = "POOR"


class SensorQuality(BaseModel):
    """Multi-factor sensor quality breakdown."""
    model_config = ConfigDict(extra="forbid")

    signal_quality: float = Field(ge=0.0, le=1.0, default=1.0, description="Signal-to-noise quality [0, 1]")
    environmental_quality: float = Field(ge=0.0, le=1.0, default=1.0, description="Atmospheric/snow condition factor [0, 1]")
    interference: float = Field(ge=0.0, le=1.0, default=0.0, description="EMI/physical interference [0, 1]")
    visibility: VisibilityCondition | None = Field(default=None, description="Visibility for optical/thermal sensors")


class SensorStatus(BaseModel):
    """Sensor status summary for UI and system telemetry."""
    model_config = ConfigDict(extra="forbid")

    id: str
    modality: SensorModality
    label: str
    short_label: str
    state: SensorState
    group: SensorGroupId
    detail: str = ""


class SensorEvidence(BaseModel):
    """Evidence contribution from a single sensor in a search zone."""
    model_config = ConfigDict(extra="forbid")

    sensor_id: str
    modality: SensorModality
    label: str
    evidence: float | None = Field(default=None, ge=0.0, le=1.0, description="Normalized measurement [0, 1] or None if unavailable")
    signal_quality: float | None = Field(default=None, ge=0.0, le=1.0)
    environmental_quality: float | None = Field(default=None, ge=0.0, le=1.0)
    interference: float | None = Field(default=None, ge=0.0, le=1.0)
    visibility: VisibilityCondition | None = None
    estimated_depth_m: float | None = Field(default=None, ge=0.0)
    localization_error_m: float | None = Field(default=None, ge=0.0)
    state: SensorState = SensorState.UNAVAILABLE
