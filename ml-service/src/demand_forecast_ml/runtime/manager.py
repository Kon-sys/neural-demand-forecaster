from __future__ import annotations

import threading
from dataclasses import dataclass

from demand_forecast_ml.runtime.predictor import (
    PredictionRuntime,
)
from demand_forecast_ml.training.registry import (
    ModelRegistry,
)


@dataclass(frozen=True, slots=True)
class ActiveModelInfo:
    version: str | None
    source: str


class RuntimeManager:
    """
    Thread-safe holder of the currently active inference runtime.

    A candidate model is fully loaded before it becomes active.
    Existing prediction requests therefore continue to use the previous
    runtime until the new model is ready.
    """

    def __init__(
        self,
        *,
        registry: ModelRegistry,
        runtime: PredictionRuntime | None = None,
        active_version: str | None = None,
        requested_device: str = "auto",
    ) -> None:
        self._registry = registry

        self._runtime = runtime

        self._active_version = (
            active_version
        )

        self._requested_device = (
            requested_device
        )

        self._lock = (
            threading.RLock()
        )

    @property
    def registry(
        self,
    ) -> ModelRegistry:
        return self._registry

    def get_runtime(
        self,
    ) -> PredictionRuntime | None:
        with self._lock:
            return self._runtime

    def active_model_info(
        self,
    ) -> ActiveModelInfo:
        with self._lock:
            return ActiveModelInfo(
                version=(
                    self._active_version
                ),
                source=(
                    "production_registry"
                    if self._active_version
                    else "bootstrap"
                ),
            )

    def activate(
        self,
        version_id: str,
    ) -> ActiveModelInfo:
        version = (
            self._registry
            .version(
                version_id
            )
        )

        if not self._registry.exists(
            version_id
        ):
            raise FileNotFoundError(
                "Model version is incomplete "
                "or does not exist: "
                f"{version_id}"
            )

        candidate_runtime = (
            PredictionRuntime.load(
                checkpoint_path=(
                    version
                    .checkpoint_path
                ),
                scalers_path=(
                    version
                    .scalers_path
                ),
                requested_device=(
                    self._requested_device
                ),
            )
        )

        # Active pointer changes only after the new runtime has
        # successfully loaded.
        self._registry.activate(
            version_id
        )

        with self._lock:
            self._runtime = (
                candidate_runtime
            )

            self._active_version = (
                version_id
            )

        return (
            self.active_model_info()
        )

    def load_active(
        self,
    ) -> bool:
        active = (
            self._registry
            .active_version()
        )

        if active is None:
            return False

        runtime = (
            PredictionRuntime.load(
                checkpoint_path=(
                    active
                    .checkpoint_path
                ),
                scalers_path=(
                    active
                    .scalers_path
                ),
                requested_device=(
                    self._requested_device
                ),
            )
        )

        with self._lock:
            self._runtime = runtime

            self._active_version = (
                active.version
            )

        return True