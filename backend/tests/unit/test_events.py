"""Unit tests for event bus types and NATS JetStream abstraction."""

import pytest

from app.events.bus import NatsEventBus
from app.schemas.events import EventEnvelope, EventType


def test_all_ten_event_types_defined():
    """Verify all 10 core event types required by Milestone 1 specification."""
    expected_event_types = {
        "OBSERVATION_RECEIVED",
        "OBSERVATION_ACCEPTED",
        "OBSERVATION_REJECTED",
        "SENSOR_STATE_CHANGED",
        "POSTERIOR_UPDATED",
        "ZONE_PRIORITY_CHANGED",
        "DECISION_UPDATED",
        "SEARCH_STARTED",
        "SEARCH_COMPLETED",
        "CONFIG_CHANGED",
    }
    actual_event_types = {e.value for e in EventType}
    assert actual_event_types == expected_event_types
    assert len(EventType) == 10


def test_event_envelope_serialization():
    """Verify EventEnvelope construction and serialization."""
    event = EventEnvelope(
        event_id="evt-001",
        event_type=EventType.OBSERVATION_RECEIVED,
        incident_id="inc-101",
        payload={"sensor_id": "rf_01", "measurement": 0.85},
    )
    assert event.event_id == "evt-001"
    assert event.event_type == EventType.OBSERVATION_RECEIVED
    assert event.source_service == "beacon-insight-backend"

    dumped = event.model_dump()
    assert dumped["event_type"] == "OBSERVATION_RECEIVED"
    assert dumped["payload"]["measurement"] == 0.85


@pytest.mark.asyncio
async def test_nats_event_bus_unconfigured_behavior():
    """Verify graceful handling when NATS URL is not configured."""
    bus = NatsEventBus(nats_url=None)
    assert not bus.is_configured

    connected = await bus.connect()
    assert connected is False

    is_healthy = await bus.check_health()
    assert is_healthy is False

    # Publish without error (returns False)
    event = EventEnvelope(
        event_id="evt-002",
        event_type=EventType.DECISION_UPDATED,
        incident_id="inc-101",
    )
    published = await bus.publish(event)
    assert published is False

    await bus.disconnect()
