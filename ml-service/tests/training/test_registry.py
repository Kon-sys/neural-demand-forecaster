from __future__ import annotations

import json

from demand_forecast_ml.training.registry import (
    ModelRegistry,
)


def _complete_version(
    registry: ModelRegistry,
):
    version = (
        registry.create_version()
    )

    version.checkpoint_path.write_bytes(
        b"checkpoint"
    )

    version.scalers_path.write_text(
        "{}",
        encoding="utf-8",
    )

    version.metadata_path.write_text(
        "{}",
        encoding="utf-8",
    )

    version.metrics_path.write_text(
        "{}",
        encoding="utf-8",
    )

    return version


def test_version_can_be_activated(
    tmp_path,
) -> None:
    registry = ModelRegistry(
        tmp_path
        / "models"
    )

    version = _complete_version(
        registry
    )

    registry.activate(
        version.version
    )

    assert (
        registry.active_version_id()
        == version.version
    )

    active = (
        registry.active_version()
    )

    assert active is not None

    assert (
        active.version
        == version.version
    )


def test_activation_file_contains_version(
    tmp_path,
) -> None:
    registry = ModelRegistry(
        tmp_path
        / "models"
    )

    version = _complete_version(
        registry
    )

    registry.activate(
        version.version
    )

    payload = json.loads(
        registry.active_file.read_text(
            encoding="utf-8",
        )
    )

    assert (
        payload[
            "version"
        ]
        == version.version
    )