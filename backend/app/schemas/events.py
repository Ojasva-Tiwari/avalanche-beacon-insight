"""Event bus event types, schemas, and event envelope definitions."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class EventType(str, Enum):
    """Core event bus topics/types for NATS JetStream."""
    OBSERVATION_RECEIVED = "OBSERVATION_RECEIVED"
    OBSERVATION_ACCEPTED = "OBSERVATION_ACCEPTED"
    OBSERVATION_REJECTED = "OBSERVATION_REJECTED"
    SENSOR_STATE_CHANGED = "SENSOR_STATE_CHANGED"
    POSTERIOR_UPDATED = "POSTERIOR_UPDATED"
    ZONE_PRIORITY_CHANGED = "ZONE_PRIORITY_CHANGED"
    DECISION_UPDATED = "DECISION_UPDATED"
    SEARCH_STARTED = "SEARCH_STARTED"
    SEARCH_COMPLETED = "SEARCH_COMPLETED"
    CONFIG_CHANGED = "CONFIG_CHANGED"


class EventEnvelope(BaseModel):
    """Standardized event envelope published to the NATS JetStream event bus."""
    model_config = ConfigDict(extra="forbid")

    event_id: str
    event_type: EventType
    incident_id: str | None = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    source_service: str = "beacon-insight-backend"
    payload: dict[str, Any] = Field(default_factory=dict)
    schema_version: str = "1.0.0"
