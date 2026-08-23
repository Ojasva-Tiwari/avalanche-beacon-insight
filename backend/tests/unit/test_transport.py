"""Unit tests for tactical transport encoders, binary frames, and CRC-16."""

import pytest

from app.schemas.domain import Priority, RecommendedAction
from app.transport.base import (
    JsonTransportEncoder,
    TacticalBinaryTransportEncoder,
    TacticalDirective,
    TransportProtocol,
)


def test_json_transport_encoder():
    """Verify JSON transport encoding and decoding round-trip."""
    directive = TacticalDirective(
        directive_id="dir-001",
        incident_id="inc-101",
        target_zone_id="ZONE_B2",
        latitude=34.123456,
        longitude=74.567890,
        priority=Priority.P1,
        recommended_action=RecommendedAction.PINPOINT_AND_PROBE,
        victim_probability=0.92,
        estimated_depth_m=1.2,
        sequence_number=1,
    )

    encoder = JsonTransportEncoder()
    encoded = encoder.encode(directive)
    assert isinstance(encoded, str)
    assert "ZONE_B2" in encoded

    decoded = encoder.decode(encoded)
    assert decoded.directive_id == directive.directive_id
    assert decoded.priority == Priority.P1
    assert decoded.recommended_action == RecommendedAction.PINPOINT_AND_PROBE
    assert decoded.victim_probability == 0.92


def test_tactical_binary_transport_encoder_roundtrip():
    """Verify TacticalBinary transport encoding with CRC-16 checksum."""
    directive = TacticalDirective(
        directive_id="dir-12",
        incident_id="inc-101",
        target_zone_id="ZONE_A1",
        latitude=34.1234,
        longitude=74.5678,
        priority=Priority.P1,
        recommended_action=RecommendedAction.PINPOINT_AND_PROBE,
        victim_probability=0.88,
        estimated_depth_m=1.5,
        sequence_number=12,
    )

    encoder = TacticalBinaryTransportEncoder()
    encoded_bytes = encoder.encode(directive)

    # Frame is binary bytes with CRC-16
    assert isinstance(encoded_bytes, bytes)
    assert encoded_bytes.startswith(b"\xab\x51")

    decoded = encoder.decode(encoded_bytes)
    assert decoded.sequence_number == 12
    assert decoded.target_zone_id == "ZONE_A1"
    assert decoded.priority == Priority.P1
    assert decoded.recommended_action == RecommendedAction.PINPOINT_AND_PROBE
    assert abs(decoded.victim_probability - 0.88) < 0.001
    assert abs(decoded.estimated_depth_m - 1.5) < 0.01


def test_tactical_binary_corrupted_crc_rejection():
    """Verify corrupted binary frames are rejected with CRC-16 mismatch error."""
    directive = TacticalDirective(
        directive_id="dir-13",
        incident_id="inc-101",
        target_zone_id="ZONE_C3",
        latitude=34.1,
        longitude=74.5,
        priority=Priority.P2,
        recommended_action=RecommendedAction.SECONDARY_SENSOR_SCAN,
        victim_probability=0.55,
        estimated_depth_m=2.0,
        sequence_number=13,
    )

    encoder = TacticalBinaryTransportEncoder()
    encoded = bytearray(encoder.encode(directive))

    # Corrupt a byte in the payload
    encoded[5] ^= 0xFF

    with pytest.raises(ValueError, match="CRC-16 mismatch"):
        encoder.decode(bytes(encoded))
