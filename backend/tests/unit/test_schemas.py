"""Unit tests for Pydantic domain, telemetry, and sensor schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.domain import (
    AvalancheStatus,
    DecisionDataMode,
    EnvironmentalConditions,
    GeoPoint,
    Incident,
    Priority,
    RecommendedAction,
    SearchZone,
    SlopeCategory,
)
from app.schemas.sensors import (
    MODALITY_TO_GROUP,
    SensorEvidence,
    SensorGroupId,
    SensorModality,
    SensorQuality,
    SensorState,
    SensorStatus,
    VisibilityCondition,
)
from app.schemas.telemetry import ObservationEnvelope, RtkGpsMetadata, SnowpackMetadata


def test_all_eight_sensor_modalities_represented():
    """Verify all 8 expected sensor modalities exist and map to appropriate groups."""
    expected_modalities = {
        "RF",
        "RECCO",
        "MOBILE_RF",
        "GPR",
        "SEISMIC",
        "ACOUSTIC",
        "THERMAL",
        "RGB",
    }
    actual_modalities = {m.value for m in SensorModality}
    assert actual_modalities == expected_modalities
    assert len(SensorModality) == 8


def test_sensor_group_mappings():
    """Verify Group A, Group B, and Group C evidence mappings."""
    assert MODALITY_TO_GROUP[SensorModality.RF] == SensorGroupId.GROUP_A_ELECTRONIC
    assert MODALITY_TO_GROUP[SensorModality.RECCO] == SensorGroupId.GROUP_A_ELECTRONIC
    assert MODALITY_TO_GROUP[SensorModality.MOBILE_RF] == SensorGroupId.GROUP_A_ELECTRONIC

    assert MODALITY_TO_GROUP[SensorModality.GPR] == SensorGroupId.GROUP_B_SUBSURFACE
    assert MODALITY_TO_GROUP[SensorModality.SEISMIC] == SensorGroupId.GROUP_B_SUBSURFACE
    assert MODALITY_TO_GROUP[SensorModality.ACOUSTIC] == SensorGroupId.GROUP_B_SUBSURFACE

    assert MODALITY_TO_GROUP[SensorModality.THERMAL] == SensorGroupId.GROUP_C_SURFACE
    assert MODALITY_TO_GROUP[SensorModality.RGB] == SensorGroupId.GROUP_C_SURFACE


def test_strict_incident_validation():
    """Verify strict validation on Incident model."""
    valid_incident = Incident(
        incident_id="inc-101",
        location_name="Gulmarg Phase 2",
        avalanche_status=AvalancheStatus.ACTIVE,
        last_known_position=GeoPoint(latitude=34.05, longitude=74.38, elevation_m=2700.0),
        avalanche_flow_bearing_deg=135.0,
        suspected_victims=2,
        elevation_m=2700.0,
        data_source="SIMULATED",
    )
    assert valid_incident.incident_id == "inc-101"
    assert valid_incident.suspected_victims == 2

    # Forbidden extra field
    with pytest.raises(ValidationError):
        Incident(
            incident_id="inc-102",
            location_name="Gulmarg",
            last_known_position=GeoPoint(latitude=34.05, longitude=74.38),
            avalanche_flow_bearing_deg=135.0,
            elevation_m=2700.0,
            extra_field="disallowed",  # extra='forbid'
        )

    # Invalid latitude out of bounds
    with pytest.raises(ValidationError):
        GeoPoint(latitude=105.0, longitude=74.38)


def test_observation_envelope_validation():
    """Verify ObservationEnvelope validation and field handling."""
    envelope = ObservationEnvelope(
        observation_id="obs-001",
        incident_id="inc-101",
        sensor_id="rf_uav_1",
        modality=SensorModality.RF,
        position=GeoPoint(latitude=34.051, longitude=74.382),
        normalized_measurement=0.88,
        quality=SensorQuality(signal_quality=0.95, environmental_quality=0.9, interference=0.05),
        data_mode=DecisionDataMode.SYNTHETIC,
        is_quarantined=False,
    )
    assert envelope.observation_id == "obs-001"
    assert envelope.modality == SensorModality.RF
    assert envelope.normalized_measurement == 0.88
    assert not envelope.is_quarantined


def test_invalid_observation_rejection():
    """Verify rejection of out-of-range normalized measurements."""
    with pytest.raises(ValidationError):
        ObservationEnvelope(
            observation_id="obs-bad",
            incident_id="inc-101",
            sensor_id="rf_uav_1",
            modality=SensorModality.RF,
            position=GeoPoint(latitude=34.051, longitude=74.382),
            normalized_measurement=1.5,  # > 1.0 violates Field(le=1.0)
        )


def test_quarantined_observation_envelope():
    """Verify quarantine fields on ObservationEnvelope."""
    envelope = ObservationEnvelope(
        observation_id="obs-quar-1",
        incident_id="inc-101",
        sensor_id="gpr_ground_1",
        modality=SensorModality.GPR,
        position=GeoPoint(latitude=34.051, longitude=74.382),
        normalized_measurement=None,
        is_quarantined=True,
        quarantine_reason="HARDWARE_TIMING_DESYNC",
    )
    assert envelope.is_quarantined is True
    assert envelope.quarantine_reason == "HARDWARE_TIMING_DESYNC"
