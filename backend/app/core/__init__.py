"""Core package for settings, logging, version, and configuration loading."""

from app.core.config import Settings, get_settings
from app.core.config_loader import ConfigurationManager, get_config_manager
from app.core.logging import get_logger, setup_logging
from app.core.version import BUILD_METADATA, MILESTONE, VERSION

__all__ = [
    "Settings",
    "get_settings",
    "ConfigurationManager",
    "get_config_manager",
    "get_logger",
    "setup_logging",
    "VERSION",
    "MILESTONE",
    "BUILD_METADATA",
]
