"""Audit and provenance schemas for traceability of inference and decisions."""

from datetime import datetime, timezone
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.domain import DecisionDataMode


class ProvenanceRecord(BaseModel):
    """Immutable audit record linking decisions to raw inputs and configuration versions."""
    model_config = ConfigDict(extra="forbid")

    incident_id: str
    inference_id: str
    decision_id: str
    observation_ids: list[str] = Field(default_factory=list)
    model_version: str = "0.1.0"
    configuration_version: str = "1.0.0"
    terrain_version: str = "copernicus-glo30-v1.0"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    data_mode: DecisionDataMode = DecisionDataMode.SYNTHETIC
    metadata: dict[str, Any] = Field(default_factory=dict)


class DecisionProvenance(BaseModel):
    """Decision provenance header included in API responses."""
    model_config = ConfigDict(extra="forbid")

    data_mode: DecisionDataMode
    decision_timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    latest_evidence_timestamp: str | None = None
    terrain_source: str = "copernicus-glo30"
    evidence_source: str = "simulated_scenario"
    engine_version: str = "0.1.0"
    configuration_checksums: dict[str, str] = Field(default_factory=dict)


class DecisionApiResponse(BaseModel):
    """Envelope wrapping all decision API responses with strict provenance."""
    model_config = ConfigDict(extra="forbid")

    provenance: DecisionProvenance
    data: Any
