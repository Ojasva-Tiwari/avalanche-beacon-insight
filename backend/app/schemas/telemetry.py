"""Telemetry, raw observation packets, and ObservationEnvelope schemas with strict validation."""

from datetime import datetime, timezone
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.domain import DecisionDataMode, GeoPoint
from app.schemas.sensors import SensorModality, SensorQuality


class RtkGpsMetadata(BaseModel):
    """High-precision RTK GNSS positioning metadata."""
    model_config = ConfigDict(extra="forbid")

    lat: float = Field(ge=-90.0, le=90.0)
    lon: float = Field(ge=-180.0, le=180.0)
    alt_m: float
    h_acc_m: float = Field(ge=0.0, description="Horizontal accuracy (sub-meter/sub-cm)")
    v_acc_m: float = Field(ge=0.0, description="Vertical accuracy (sub-meter/sub-cm)")


class SnowpackMetadata(BaseModel):
    """Snowpack field telemetry."""
    model_config = ConfigDict(extra="forbid")

    density_kg_m3: float = Field(ge=50.0, le=800.0, default=350.0)
    lwc_percent: float = Field(ge=0.0, le=100.0, default=0.0, description="Liquid Water Content %")
    temp_c: float = Field(default=-5.0)


class GroundTruthTargetMetadata(BaseModel):
    """Ground truth target metadata for empirical validation."""
    model_config = ConfigDict(extra="forbid")

    target_present: bool
    target_id: str | None = None
    depth_m: float | None = Field(default=None, ge=0.0)
    orientation_deg: float | None = Field(default=None, ge=0.0, le=360.0)


class UnitDeclaration(BaseModel):
    """Unit definition for sensor measurement."""
    model_config = ConfigDict(extra="forbid")

    metric_name: str
    unit: str
    is_normalized_0_to_1: bool


class ObservationEnvelope(BaseModel):
    """Canonical ingested observation envelope passing through the backend pipeline."""
    model_config = ConfigDict(extra="forbid")

    observation_id: str
    incident_id: str
    sensor_id: str
    modality: SensorModality
    event_timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp when physical observation was captured",
    )
    received_timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp when backend received the envelope",
    )
    position: GeoPoint
    raw_payload: dict[str, Any] = Field(default_factory=dict)
    normalized_measurement: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Normalized evidence value in range [0, 1], or None if degraded/offline",
    )
    quality: SensorQuality = Field(default_factory=SensorQuality)
    metadata: dict[str, Any] = Field(default_factory=dict)
    data_mode: DecisionDataMode = DecisionDataMode.SYNTHETIC
    is_quarantined: bool = False
    quarantine_reason: str | None = None
    payload_hash: str | None = None


class FieldObservationPacket(BaseModel):
    """Standardized physical field observation packet."""
    model_config = ConfigDict(extra="forbid")

    experiment_id: str
    sensor_serial_id: str
    modality: SensorModality
    timestamp_iso: str
    rtk_gps: RtkGpsMetadata
    snowpack: SnowpackMetadata
    raw_payload: dict[str, Any] = Field(default_factory=dict)
    ground_truth: GroundTruthTargetMetadata
    data_mode: DecisionDataMode = DecisionDataMode.SYNTHETIC
    payload_hash: str | None = None
    worm_tag: str | None = None
    ingest_timestamp_iso: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
