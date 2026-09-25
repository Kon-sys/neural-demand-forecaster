from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import torch
from torch import nn

from demand_forecast_ml.data.preprocessing import (
    MinMaxScaler1D,
)
from demand_forecast_ml.lstm.checkpoint import (
    load_checkpoint,
)
from demand_forecast_ml.lstm.scaling import (
    SeriesScalerRegistry,
)
from demand_forecast_ml.lstm.training import (
    resolve_device,
)


class PredictionRuntimeError(
    RuntimeError
):
    """Base error raised by prediction runtime."""


class UnknownSeriesError(
    PredictionRuntimeError
):
    """
    Legacy error type kept for API compatibility.

    New product series are no longer rejected solely because
    the training scaler registry does not contain their SKU.
    """


class InvalidHistoryError(
    PredictionRuntimeError
):
    """Raised when supplied demand history cannot be used for inference."""


@dataclass(
    frozen=True,
    slots=True,
)
class PredictionResult:
    product_sku: str
    prediction: float
    window_size: int
    history_points_used: int


@dataclass(
    frozen=True,
    slots=True,
)
class RuntimeHealth:
    model_loaded: bool
    scalers_loaded: bool
    device: str
    window_size: int
    series_count: int


def resolve_runtime_device(
        requested_device: str,
) -> torch.device:
    normalized = (
        requested_device
        .strip()
        .lower()
    )

    if normalized == "auto":
        return resolve_device()

    if normalized == "cpu":
        return torch.device(
            "cpu"
        )

    if normalized == "cuda":
        if not torch.cuda.is_available():
            raise PredictionRuntimeError(
                "CUDA was requested but is not available."
            )

        return torch.device(
            "cuda"
        )

    raise PredictionRuntimeError(
        "Unsupported ML device. "
        "Expected one of: auto, cpu, cuda."
    )


class PredictionRuntime:
    """
    Loaded LSTM inference runtime.

    The runtime owns:

    - the frozen LSTM checkpoint;
    - TRAIN-only per-series scalers for known product series;
    - the inference device;
    - the fixed model window size.

    For product series that were not present during model training,
    an inference-only Min-Max scaler is fitted from the supplied
    historical demand values.

    The LSTM itself is never trained or modified during prediction.
    """

    def __init__(
            self,
            *,
            model: nn.Module,
            scalers: SeriesScalerRegistry,
            device: torch.device,
            window_size: int,
    ) -> None:
        if window_size <= 0:
            raise ValueError(
                "window_size must be greater than zero."
            )

        self._model = model
        self._scalers = scalers
        self._device = device
        self._window_size = window_size

        self._model.to(
            self._device
        )

        self._model.eval()

    @classmethod
    def load(
            cls,
            *,
            checkpoint_path: str | Path,
            scalers_path: str | Path,
            requested_device: str = "auto",
    ) -> "PredictionRuntime":
        device = resolve_runtime_device(
            requested_device
        )

        loaded_checkpoint = load_checkpoint(
            checkpoint_path,
            device=device,
        )

        scalers = (
            SeriesScalerRegistry.load(
                scalers_path
            )
        )

        return cls(
            model=loaded_checkpoint.model,
            scalers=scalers,
            device=device,
            window_size=(
                loaded_checkpoint
                .config
                .window_size
            ),
        )

    @property
    def window_size(
            self,
    ) -> int:
        return self._window_size

    def health(
            self,
    ) -> RuntimeHealth:
        return RuntimeHealth(
            model_loaded=True,
            scalers_loaded=True,
            device=str(
                self._device
            ),
            window_size=(
                self._window_size
            ),
            series_count=len(
                self._scalers.scalers
            ),
        )

    def _normalize_history(
            self,
            history: Iterable[float],
    ) -> tuple[
        float,
        ...,
    ]:
        values: list[
            float
        ] = []

        for value in history:
            try:
                numeric = float(
                    value
                )
            except (
                    TypeError,
                    ValueError,
            ) as exc:
                raise InvalidHistoryError(
                    "Demand history must contain numeric values only."
                ) from exc

            if not math.isfinite(
                    numeric
            ):
                raise InvalidHistoryError(
                    "Demand history must contain finite values only."
                )

            if numeric < 0:
                raise InvalidHistoryError(
                    "Demand history must not contain negative values."
                )

            values.append(
                numeric
            )

        if len(
                values
        ) < self._window_size:
            raise InvalidHistoryError(
                "Insufficient demand history. "
                f"Expected at least {self._window_size} values, "
                f"received {len(values)}."
            )

        return tuple(
            values
        )

    def _resolve_scaler(
            self,
            *,
            product_sku: str,
            history: tuple[
                float,
                ...,
            ],
    ) -> MinMaxScaler1D:
        """
        Resolve scaling parameters for inference.

        Known product series use the TRAIN-only scaler stored together
        with the model.

        A product created after model training has no persisted scaler.
        For such a series, scaling parameters are derived exclusively
        from its already observed historical demand.

        No future values or prediction targets participate in fitting.
        """
        try:
            return (
                self._scalers.get(
                    product_sku
                )
            )
        except KeyError:
            return MinMaxScaler1D(
                min_value=min(
                    history
                ),
                max_value=max(
                    history
                ),
            )

    def predict(
            self,
            *,
            product_sku: str,
            history: Iterable[float],
    ) -> PredictionResult:
        normalized_sku = (
            str(
                product_sku
            )
            .strip()
        )

        if not normalized_sku:
            raise InvalidHistoryError(
                "product_sku must not be blank."
            )

        full_history = (
            self._normalize_history(
                history
            )
        )

        scaler = (
            self._resolve_scaler(
                product_sku=(
                    normalized_sku
                ),
                history=(
                    full_history
                ),
            )
        )

        input_history = (
            full_history[
                -self._window_size:
            ]
        )

        scaled_history = [
            scaler.transform_value(
                value
            )
            for value in input_history
        ]

        inputs = torch.tensor(
            scaled_history,
            dtype=torch.float32,
            device=self._device,
        ).reshape(
            1,
            self._window_size,
            1,
        )

        with torch.no_grad():
            scaled_prediction = float(
                self._model(
                    inputs
                )
                .detach()
                .cpu()
                .reshape(
                    -1
                )[0]
            )

        prediction = (
            scaler
            .inverse_transform_value(
                scaled_prediction
            )
        )

        if not math.isfinite(
                prediction
        ):
            raise PredictionRuntimeError(
                "Model produced a non-finite prediction."
            )

        prediction = max(
            0.0,
            float(
                prediction
            ),
        )

        return PredictionResult(
            product_sku=(
                normalized_sku
            ),
            prediction=(
                prediction
            ),
            window_size=(
                self._window_size
            ),
            history_points_used=len(
                input_history
            ),
        )