"""System metadata, configuration versioning, and modality inspection endpoints."""

from typing import Any
from fastapi import APIRouter

from app.core.config import get_settings
from app.core.config_loader import get_config_manager
from app.core.version import BUILD_METADATA, VERSION
from app.ingestion.registry import get_adapter_registry
from app.schemas.sensors import MODALITY_TO_GROUP, SensorGroupId, SensorModality

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/info", summary="System runtime metadata and configuration provenance")
async def get_system_info() -> dict[str, Any]:
    """Returns system runtime metadata, supported modalities, and configuration checksums."""
    settings = get_settings()
    config_mgr = get_config_manager()
    registry = get_adapter_registry()

    # Supported modalities and their groups
    modalities_info = [
        {
            "modality": m.value,
            "group": MODALITY_TO_GROUP[m].value,
        }
        for m in SensorModality
    ]

    # Group structure
    groups_info = [
        {
            "group": g.value,
            "modalities": [m.value for m, grp in MODALITY_TO_GROUP.items() if grp == g],
        }
        for g in SensorGroupId
    ]

    # Active config metadata
    configs_metadata = {
        name: {
            "version": meta.version,
            "checksum_sha256": meta.checksum_sha256,
            "activated_by": meta.activated_by,
            "activation_timestamp": meta.activation_timestamp,
        }
        for name, meta in config_mgr.get_all_metadata().items()
    }

    return {
        "service": settings.SERVICE_NAME,
        "version": VERSION,
        "environment": settings.ENVIRONMENT,
        "data_mode": settings.DATA_MODE,
        "build": BUILD_METADATA,
        "supported_modalities": modalities_info,
        "evidence_groups": groups_info,
        "registered_adapters": registry.list_all_sensor_ids(),
        "configurations": configs_metadata,
    }
