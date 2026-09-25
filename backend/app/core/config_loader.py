"""Versioned configuration loader for YAML configuration files."""

import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field

from app.core.logging import get_logger

logger = get_logger("config_loader")


class ConfigVersionMetadata(BaseModel):
    """Metadata tracking configuration file version, identity, and activation."""

    config_name: str
    version: str
    checksum_sha256: str
    activated_by: str = "system_startup"
    activation_timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    reason: str = "initial_load"
    file_path: str


class LoadedConfiguration(BaseModel):
    """Encapsulates loaded configuration data and its provenance metadata."""

    metadata: ConfigVersionMetadata
    content: dict[str, Any]


class ConfigurationManager:
    """Manages loading and version verification of YAML configuration files."""

    def __init__(self, config_dir: Path | str | None = None) -> None:
        if config_dir is None:
            self.config_dir = Path(__file__).resolve().parent.parent.parent / "config"
        else:
            self.config_dir = Path(config_dir)
        self._configs: dict[str, LoadedConfiguration] = {}

    def load_all(self) -> dict[str, LoadedConfiguration]:
        """Loads all YAML configuration files in the config directory."""
        config_files = ["fusion.yaml", "sensors.yaml", "terrain.yaml", "survival.yaml", "decision.yaml"]
        for cf in config_files:
            path = self.config_dir / cf
            if path.exists():
                self.load_file(path)
            else:
                logger.warning("Configuration file not found: %s", path)
        return self._configs

    def load_file(self, file_path: Path | str) -> LoadedConfiguration:
        """Loads a single YAML configuration file with checksum computation."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Config file not found: {path}")

        raw_bytes = path.read_bytes()
        sha256_hash = hashlib.sha256(raw_bytes).hexdigest()

        try:
            content = yaml.safe_load(raw_bytes.decode("utf-8")) or {}
        except yaml.YAMLError as exc:
            logger.error("Failed to parse YAML file %s: %s", path, exc)
            raise ValueError(f"Invalid YAML in {path}: {exc}") from exc

        config_name = path.stem
        version = content.get("version", "1.0.0")

        metadata = ConfigVersionMetadata(
            config_name=config_name,
            version=version,
            checksum_sha256=sha256_hash,
            file_path=str(path.resolve()),
        )

        loaded = LoadedConfiguration(metadata=metadata, content=content)
        self._configs[config_name] = loaded
        logger.info("Loaded configuration '%s' v%s (sha256: %s)", config_name, version, sha256_hash[:8])
        return loaded

    def get(self, config_name: str) -> LoadedConfiguration | None:
        """Retrieves a loaded configuration by name."""
        return self._configs.get(config_name)

    def get_all_metadata(self) -> dict[str, ConfigVersionMetadata]:
        """Retrieves metadata for all loaded configurations."""
        return {name: config.metadata for name, config in self._configs.items()}


_global_config_manager: ConfigurationManager | None = None


def get_config_manager() -> ConfigurationManager:
    """Returns the global singleton ConfigurationManager."""
    global _global_config_manager
    if _global_config_manager is None:
        _global_config_manager = ConfigurationManager()
        _global_config_manager.load_all()
    return _global_config_manager
