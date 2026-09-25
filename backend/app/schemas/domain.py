"""Domain schemas representing core SAR entities and decision contracts."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.sensors import SensorEvidence, VisibilityCondition


class Priority(str, Enum):
    """Operational triage priorities."""
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"


class RecommendedAction(str, Enum):
    """Operational search recommendations."""
    PINPOINT_AND_PROBE = "PINPOINT_AND_PROBE"
    SECONDARY_SENSOR_SCAN = "SECONDARY_SENSOR_SCAN"
    REMOTE_SENSING = "REMOTE_SENSING"
    DEFER = "DEFER"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class AvalancheStatus(str, Enum):
    """Incident avalanche danger status."""
    ACTIVE = "ACTIVE"
    STABILIZING = "STABILIZING"
    CLEARED = "CLEARED"


class DecisionDataMode(str, Enum):
    """Data provenance and operational modes."""
    LIVE_CONNECTED = "LIVE_CONNECTED"
    OFFLINE_CACHED = "OFFLINE_CACHED"
    OFFLINE_NO_DATA = "OFFLINE_NO_DATA"
    SYNTHETIC = "SYNTHETIC"
    REPLAY = "REPLAY"
    REAL_SENSOR = "REAL_SENSOR"
    UNKNOWN = "UNKNOWN"


class WindCondition(str, Enum):
    """Atmospheric wind conditions."""
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"


class GeoPoint(BaseModel):
    """WGS84 geospatial coordinate."""
    model_config = ConfigDict(extra="forbid")

    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    elevation_m: float | None = Field(default=None, ge=0.0)


class Incident(BaseModel):
    """Core SAR incident record."""
    model_config = ConfigDict(extra="forbid")

    incident_id: str
    location_name: str
    avalanche_status: AvalancheStatus = AvalancheStatus.ACTIVE
    last_known_position: GeoPoint
    avalanche_flow_bearing_deg: float = Field(ge=0.0, le=360.0)
    suspected_victims: int = Field(ge=1, default=1)
    declared_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    elevation_m: float = Field(ge=0.0)
    data_source: Literal["SIMULATED", "LIVE_FIELD"] = "SIMULATED"


class EnvironmentalConditions(BaseModel):
    """Ambient weather and snowpack conditions."""
    model_config = ConfigDict(extra="forbid")

    snow_depth_m: float = Field(ge=0.0, default=1.5)
    visibility: VisibilityCondition = VisibilityCondition.GOOD
    wind: WindCondition = WindCondition.LOW
    temperature_c: float = Field(default=-5.0)
    data_source: Literal["SIMULATED", "LIVE_FIELD"] = "SIMULATED"


class MapRoutingPath(BaseModel):
    """Traverse and sweep waypoints."""
    model_config = ConfigDict(extra="forbid")

    waypoints: list[tuple[float, float]] = Field(default_factory=list)
    path_type: Literal["RESCUER_TRAVERSE", "UAV_SWEEP"] = "RESCUER_TRAVERSE"


class SearchZone(BaseModel):
    """Search grid zone candidate for Bayesian inference and triage ranking."""
    model_config = ConfigDict(extra="forbid")

    zone_id: str
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    victim_probability: float | None = Field(default=None, ge=0.0, le=1.0)
    priority: Priority | None = None
    estimated_depth_m: float | None = Field(default=None, ge=0.0)
    localization_error_m: float | None = Field(default=None, ge=0.0)
    recommended_action: RecommendedAction = RecommendedAction.DEFER
    in_avalanche_path: bool = False
    polygon_bounds: list[tuple[float, float]] | None = None
    routing_path: MapRoutingPath | None = None


class SlopeCategory(str, Enum):
    """Terrain slope categorization."""
    FLAT = "FLAT"
    MODERATE = "MODERATE"
    AVALANCHE_PRONE = "AVALANCHE_PRONE"
    EXTREME = "EXTREME"


class ZoneTerrainFeatures(BaseModel):
    """DEM-derived terrain features for a search zone."""
    model_config = ConfigDict(extra="forbid")

    zone_id: str
    latitude: float
    longitude: float
    elevation_m: float
    slope_angle_degrees: float = Field(ge=0.0, le=90.0)
    aspect_degrees: float = Field(ge=0.0, le=360.0)
    aspect_compass: Literal["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    slope_hazard_risk: float = Field(ge=1.0, le=3.0)
    slope_category: SlopeCategory


class ExplanationItem(BaseModel):
    """Deterministic explanation item."""
    model_config = ConfigDict(extra="forbid")

    kind: Literal["SUPPORT", "CAUTION"]
    text: str


class ZoneDetails(BaseModel):
    """Complete zone state with evidence, terrain, utility, and explanation breakdown."""
    model_config = ConfigDict(extra="forbid")

    zone: str
    victim_probability: float | None = Field(default=None, ge=0.0, le=1.0)
    priority: Priority | None = None
    recommended_action: RecommendedAction
    alternative_actions: list[RecommendedAction] = Field(default_factory=list)
    location: dict[str, Any]
    estimated_depth_m: float | None = None
    contextual_prior: Literal["HIGH", "MODERATE", "LOW"] = "MODERATE"
    temporal_consistency: float | None = None
    evidence: list[SensorEvidence] = Field(default_factory=list)
    explanation: list[ExplanationItem] = Field(default_factory=list)
    status_note: str | None = None
    terrain_features: ZoneTerrainFeatures | None = None
    polygon_bounds: list[tuple[float, float]] | None = None
    routing_path: MapRoutingPath | None = None


class HealthStatus(BaseModel):
    """Truthful system health check response model."""
    model_config = ConfigDict(extra="forbid")

    status: Literal["healthy", "degraded", "unhealthy"]
    service: str
    version: str
    mode: str
    database: Literal["connected", "not_configured", "error"]
    event_bus: Literal["connected", "not_configured", "error"]
    inference: Literal["ready", "not_initialized", "error"]
