from __future__ import annotations

from typing import Protocol

from fastapi import Request

from demand_forecast_ml.runtime.manager import (
    RuntimeManager,
)
from demand_forecast_ml.runtime.predictor import (
    PredictionResult,
    RuntimeHealth,
)
from demand_forecast_ml.training.service import (
    TrainingService,
)


class PredictorProtocol(
    Protocol
):
    def predict(
        self,
        *,
        product_sku: str,
        history: list[float],
    ) -> PredictionResult:
        ...

    def health(
        self,
    ) -> RuntimeHealth:
        ...


class RuntimeUnavailableError(
    RuntimeError
):
    """Raised when inference runtime is not available."""


class TrainingUnavailableError(
    RuntimeError
):
    """Raised when training service is not available."""


def get_runtime_manager(
    request: Request,
) -> RuntimeManager:
    manager = getattr(
        request.app.state,
        "runtime_manager",
        None,
    )

    if manager is None:
        raise RuntimeUnavailableError(
            "ML runtime manager is not available."
        )

    return manager


def get_predictor(
    request: Request,
) -> PredictorProtocol:
    manager = (
        get_runtime_manager(
            request
        )
    )

    predictor = (
        manager.get_runtime()
    )

    if predictor is None:
        raise RuntimeUnavailableError(
            "ML inference runtime is not available."
        )

    return predictor


def get_training_service(
    request: Request,
) -> TrainingService:
    service = getattr(
        request.app.state,
        "training_service",
        None,
    )

    if service is None:
        raise TrainingUnavailableError(
            "ML training service is not available."
        )

    return service