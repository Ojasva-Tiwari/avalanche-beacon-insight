"""Architecture integrity tests verifying package structure and importability."""

import importlib
import pytest


def test_package_import_integrity():
    """Verify all backend packages and modules import cleanly without circular dependencies."""
    modules_to_test = [
        "app.main",
        "app.core",
        "app.core.config",
        "app.core.config_loader",
        "app.core.logging",
        "app.core.version",
        "app.api.v1.router",
        "app.api.v1.endpoints.health",
        "app.api.v1.endpoints.system",
        "app.schemas.domain",
        "app.schemas.sensors",
        "app.schemas.telemetry",
        "app.schemas.events",
        "app.db.base",
        "app.db.session",
        "app.ingestion.base",
        "app.ingestion.registry",
        "app.events.bus",
        "app.transport.base",
        "app.audit.provenance",
        "app.inference",
        "app.decision",
        "app.terrain",
        "app.survival",
        "app.simulation",
        "app.calibration",
    ]

    for module_name in modules_to_test:
        mod = importlib.import_module(module_name)
        assert mod is not None, f"Failed to import {module_name}"
