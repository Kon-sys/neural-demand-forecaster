from __future__ import annotations

import pandas as pd
import pytest

from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    IMPUTED_COLUMN,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from demand_forecast_ml.evaluation.comparison import (
    align_test_predictions,
    build_moving_average_test_predictions,
    calculate_comparison_metrics,
)


def _build_dataset() -> pd.DataFrame:
    dates = pd.date_range(
        "2024-06-07",
        periods=20,
        freq="D",
    )

    frames: list[
        pd.DataFrame
    ] = []

    for product_sku in [
        "SKU-A",
        "SKU-B",
    ]:
        multiplier = (
            1.0
            if product_sku == "SKU-A"
            else 2.0
        )

        frames.append(
            pd.DataFrame(
                {
                    PRODUCT_COLUMN: (
                        [product_sku]
                        * len(
                            dates
                        )
                    ),
                    DATE_COLUMN: dates,
                    TARGET_COLUMN: [
                        multiplier
                        * float(
                            index + 1
                        )
                        for index in range(
                            len(
                                dates
                            )
                        )
                    ],
                    IMPUTED_COLUMN: (
                        [False]
                        * len(
                            dates
                        )
                    ),
                }
            )
        )

    return (
        pd.concat(
            frames,
            ignore_index=True,
        )
        .sort_values(
            by=[
                PRODUCT_COLUMN,
                DATE_COLUMN,
            ],
        )
        .reset_index(
            drop=True
        )
    )


def test_moving_average_test_uses_previous_actual_values() -> None:
    dataframe = (
        _build_dataset()
    )

    predictions = (
        build_moving_average_test_predictions(
            dataframe,
            window=2,
        )
    )

    first = predictions.loc[
        predictions[
            PRODUCT_COLUMN
        ].eq(
            "SKU-A"
        )
    ].iloc[0]

    assert (
        first[
            DATE_COLUMN
        ]
        == pd.Timestamp(
            "2024-06-26"
        )
    )

    # SKU-A:
    # 2024-06-24 -> 18
    # 2024-06-25 -> 19
    # prediction for 2024-06-26 -> (18 + 19) / 2
    assert (
        first[
            "prediction"
        ]
        == pytest.approx(
            18.5
        )
    )


def test_models_must_have_identical_test_keys() -> None:
    moving_average = pd.DataFrame(
        {
            PRODUCT_COLUMN: [
                "SKU-A",
            ],
            DATE_COLUMN: pd.to_datetime(
                [
                    "2024-06-26",
                ]
            ),
            "actual": [
                5.0,
            ],
            "prediction": [
                4.0,
            ],
        }
    )

    lstm = pd.DataFrame(
        {
            PRODUCT_COLUMN: [
                "SKU-B",
            ],
            DATE_COLUMN: pd.to_datetime(
                [
                    "2024-06-26",
                ]
            ),
            "actual": [
                5.0,
            ],
            "prediction": [
                4.5,
            ],
        }
    )

    with pytest.raises(
        ValueError,
        match=(
            "identical TEST observations"
        ),
    ):
        align_test_predictions(
            moving_average,
            lstm,
        )


def test_ground_truth_must_match_between_models() -> None:
    moving_average = pd.DataFrame(
        {
            PRODUCT_COLUMN: [
                "SKU-A",
            ],
            DATE_COLUMN: pd.to_datetime(
                [
                    "2024-06-26",
                ]
            ),
            "actual": [
                5.0,
            ],
            "prediction": [
                4.0,
            ],
        }
    )

    lstm = pd.DataFrame(
        {
            PRODUCT_COLUMN: [
                "SKU-A",
            ],
            DATE_COLUMN: pd.to_datetime(
                [
                    "2024-06-26",
                ]
            ),
            "actual": [
                6.0,
            ],
            "prediction": [
                4.5,
            ],
        }
    )

    with pytest.raises(
        ValueError,
        match=(
            "Ground truth differs"
        ),
    ):
        align_test_predictions(
            moving_average,
            lstm,
        )


def test_comparison_metrics_are_calculated_for_both_models() -> None:
    predictions = pd.DataFrame(
        {
            PRODUCT_COLUMN: [
                "SKU-A",
                "SKU-A",
            ],
            DATE_COLUMN: pd.to_datetime(
                [
                    "2024-06-26",
                    "2024-06-27",
                ]
            ),
            "actual": [
                10.0,
                20.0,
            ],
            "moving_average_prediction": [
                9.0,
                18.0,
            ],
            "lstm_prediction": [
                10.0,
                19.0,
            ],
        }
    )

    metrics = (
        calculate_comparison_metrics(
            predictions
        )
    )

    assert set(
        metrics[
            "model"
        ]
    ) == {
        "moving_average",
        "lstm",
    }

    moving_average = (
        metrics.loc[
            metrics[
                "model"
            ].eq(
                "moving_average"
            )
        ]
        .iloc[0]
    )

    lstm = (
        metrics.loc[
            metrics[
                "model"
            ].eq(
                "lstm"
            )
        ]
        .iloc[0]
    )

    assert (
        moving_average[
            "mae"
        ]
        == pytest.approx(
            1.5
        )
    )

    assert (
        lstm[
            "mae"
        ]
        == pytest.approx(
            0.5
        )
    )