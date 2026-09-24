from __future__ import annotations

import pytest
import torch
from torch import nn

from demand_forecast_ml.data.preprocessing import (
    MinMaxScaler1D,
)
from demand_forecast_ml.lstm.scaling import (
    SeriesScalerRegistry,
)
from demand_forecast_ml.runtime.predictor import (
    InvalidHistoryError,
    PredictionRuntime,
    UnknownSeriesError,
)


class ConstantModel(
    nn.Module
):
    def __init__(
        self,
        value: float,
    ) -> None:
        super().__init__()

        self._value = float(
            value
        )

    def forward(
        self,
        inputs: torch.Tensor,
    ) -> torch.Tensor:
        return torch.full(
            (
                inputs.shape[0],
                1,
            ),
            self._value,
            dtype=torch.float32,
            device=inputs.device,
        )


def _runtime() -> PredictionRuntime:
    scalers = SeriesScalerRegistry(
        scalers={
            "SKU-A": MinMaxScaler1D(
                min_value=10.0,
                max_value=20.0,
            ),
        }
    )

    return PredictionRuntime(
        model=ConstantModel(
            0.5
        ),
        scalers=scalers,
        device=torch.device(
            "cpu"
        ),
        window_size=3,
    )


def test_prediction_is_inverse_transformed() -> None:
    runtime = _runtime()

    result = runtime.predict(
        product_sku="SKU-A",
        history=[
            10.0,
            15.0,
            20.0,
        ],
    )

    assert (
        result.prediction
        == pytest.approx(
            15.0
        )
    )

    assert (
        result.window_size
        == 3
    )

    assert (
        result.history_points_used
        == 3
    )


def test_runtime_accepts_longer_history() -> None:
    runtime = _runtime()

    result = runtime.predict(
        product_sku="SKU-A",
        history=[
            1.0,
            2.0,
            3.0,
            10.0,
            15.0,
            20.0,
        ],
    )

    assert (
        result.prediction
        == pytest.approx(
            15.0
        )
    )


def test_runtime_rejects_insufficient_history() -> None:
    runtime = _runtime()

    with pytest.raises(
        InvalidHistoryError,
        match=(
            "Insufficient demand history"
        ),
    ):
        runtime.predict(
            product_sku="SKU-A",
            history=[
                10.0,
                11.0,
            ],
        )


def test_runtime_rejects_unknown_series() -> None:
    runtime = _runtime()

    with pytest.raises(
        UnknownSeriesError,
        match=(
            "No scaler exists"
        ),
    ):
        runtime.predict(
            product_sku="UNKNOWN",
            history=[
                10.0,
                11.0,
                12.0,
            ],
        )