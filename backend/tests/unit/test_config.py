"""Unit tests for configuration loading, versioning, and Settings."""

from pathlib import Path
import pytest

from app.core.config import Settings
from app.core.config_loader import ConfigurationManager


def test_configuration_loading_all_sources():
    """Verify loading of all 5 YAML configuration sources with SHA-256 checksums."""
    config_dir = Path(__file__).resolve().parent.parent.parent / "config"
    mgr = ConfigurationManager(config_dir=config_dir)
    loaded = mgr.load_all()

    assert "fusion" in loaded
    assert "sensors" in loaded
    assert "terrain" in loaded
    assert "survival" in loaded
    assert "decision" in loaded

    for name, cfg in loaded.items():
        assert cfg.metadata.version == "1.0.0"
        assert len(cfg.metadata.checksum_sha256) == 64  # Valid SHA-256
        assert cfg.metadata.config_name == name


def test_fusion_config_content():
    """Verify fusion.yaml group caps and weights."""
    mgr = ConfigurationManager()
    mgr.load_all()
    fusion = mgr.get("fusion")
    assert fusion is not None

    groups = fusion.content["groups"]
    assert groups["GROUP_A_ELECTRONIC"]["cap"] == 4.5
    assert groups["GROUP_A_ELECTRONIC"]["weight"] == 1.0
    assert groups["GROUP_B_SUBSURFACE"]["cap"] == 4.0
    assert groups["GROUP_B_SUBSURFACE"]["weight"] == 0.95
    assert groups["GROUP_C_SURFACE"]["cap"] == 2.2
    assert groups["GROUP_C_SURFACE"]["weight"] == 0.6


def test_sensors_config_all_eight_modalities():
    """Verify sensors.yaml specifies all 8 sensor modalities."""
    mgr = ConfigurationManager()
    mgr.load_all()
    sensors = mgr.get("sensors")
    assert sensors is not None

    sensor_dict = sensors.content["sensors"]
    modalities = ["RF", "RECCO", "MOBILE_RF", "GPR", "SEISMIC", "ACOUSTIC", "THERMAL", "RGB"]
    for m in modalities:
        assert m in sensor_dict
        assert "tpr" in sensor_dict[m]
        assert "fpr" in sensor_dict[m]
        assert sensor_dict[m]["tpr"] > sensor_dict[m]["fpr"]


def test_settings_defaults_and_db_config():
    """Verify Settings defaults and database URL handling."""
    settings = Settings()
    assert settings.SERVICE_NAME == "beacon-insight-backend"
    assert settings.DATA_MODE == "synthetic"
    assert settings.DATABASE_URL is None  # Default None for truthful unconfigured state
