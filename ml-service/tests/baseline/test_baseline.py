from __future__ import annotations

import pandas as pd
import pytest

from demand_forecast_ml.baseline.moving_average import (
    build_moving_average_validation_predictions,
)
from demand_forecast_ml.baseline.naive import (
    build_naive_validation_predictions,
)
from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    IMPUTED_COLUMN,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from demand_forecast_ml.evaluation.metrics import (
    calculate_regression_metrics,
)


def _create_dataset() -> pd.DataFrame:
    return pd.DataFrame(
        {
            PRODUCT_COLUMN: [
                "SKU-001",
            ]
            * 10,
            DATE_COLUMN: (
                pd.date_range(
                    "2026-01-01",
                    periods=10,
                    freq="D",
                )
            ),
            TARGET_COLUMN: [
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                9,
                10,
            ],
            IMPUTED_COLUMN: [
                False,
            ]
            * 10,
        }
    )


def test_naive_uses_previous_observation() -> None:
    dataframe = _create_dataset()

    predictions = (
        build_naive_validation_predictions(
            dataframe,
            train_end="2026-01-05",
            validation_end="2026-01-08",
        )
    )

    first = predictions.iloc[0]

    assert first["actual"] == 6
    assert first["prediction"] == 5


def test_moving_average_uses_only_previous_window() -> None:
    dataframe = _create_dataset()

    predictions = (
        build_moving_average_validation_predictions(
            dataframe,
            train_end="2026-01-05",
            validation_end="2026-01-08",
            windows=[3],
        )
    )

    first = predictions.iloc[0]

    assert first["actual"] == 6

    assert first[
        "prediction"
    ] == pytest.approx(
        4.0
    )


def test_metrics_are_calculated_correctly() -> None:
    metrics = (
        calculate_regression_metrics(
            actual=[
                2,
                4,
            ],
            predicted=[
                1,
                5,
            ],
        )
    )

    assert metrics.mae == pytest.approx(
        1.0
    )

    assert metrics.rmse == pytest.approx(
        1.0
    )

    assert metrics.mape == pytest.approx(
        37.5
    )


def test_mape_ignores_zero_actual_values() -> None:
    metrics = (
        calculate_regression_metrics(
            actual=[
                0,
                10,
            ],
            predicted=[
                5,
                8,
            ],
        )
    )

    assert metrics.mape == pytest.approx(
        20.0
    )

    assert (
        metrics.mape_observations
        == 1
    )


def test_validation_predictions_do_not_enter_test_period() -> None:
    dataframe = _create_dataset()

    predictions = (
        build_moving_average_validation_predictions(
            dataframe,
            train_end="2026-01-05",
            validation_end="2026-01-08",
            windows=[2, 3],
        )
    )

    assert (
        predictions[
            DATE_COLUMN
        ].max()
        == pd.Timestamp(
            "2026-01-08"
        )
    )