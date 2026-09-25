"""API tests for system metadata and configuration inspection."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_system_info_endpoint(async_client: AsyncClient):
    """Verify /api/v1/system/info returns metadata, all 8 modalities, and configurations."""
    response = await async_client.get("/api/v1/system/info")
    assert response.status_code == 200
    data = response.json()

    assert data["service"] == "beacon-insight-backend"
    assert data["version"] == "0.1.0"

    # All 8 modalities
    modalities = [m["modality"] for m in data["supported_modalities"]]
    assert len(modalities) == 8
    for m in ["RF", "RECCO", "MOBILE_RF", "GPR", "SEISMIC", "ACOUSTIC", "THERMAL", "RGB"]:
        assert m in modalities

    # Evidence groups
    groups = [g["group"] for g in data["evidence_groups"]]
    assert "GROUP_A_ELECTRONIC" in groups
    assert "GROUP_B_SUBSURFACE" in groups
    assert "GROUP_C_SURFACE" in groups

    # Configurations loaded
    configs = data["configurations"]
    for c in ["fusion", "sensors", "terrain", "survival", "decision"]:
        assert c in configs
        assert "checksum_sha256" in configs[c]
