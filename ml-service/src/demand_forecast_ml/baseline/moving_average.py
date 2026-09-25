from __future__ import annotations

from collections.abc import Iterable

import pandas as pd

from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from demand_forecast_ml.data.split import (
    split_by_date,
)
from demand_forecast_ml.data.validate import (
    validate_processed_dataframe,
)


def build_moving_average_validation_predictions(
    dataframe: pd.DataFrame,
    *,
    train_end: str | pd.Timestamp,
    validation_end: str | pd.Timestamp,
    windows: Iterable[int],
) -> pd.DataFrame:
    """
    Build rolling one-step-ahead Moving Average predictions.

    Formula:

        prediction(t) =
            mean(
                actual(t-window),
                ...,
                actual(t-1)
            )

    Current and future target values are not used in the prediction.
    """

    validate_processed_dataframe(
        dataframe
    )

    candidate_windows = tuple(
        int(window)
        for window in windows
    )

    if not candidate_windows:
        raise ValueError(
            "At least one Moving Average window is required."
        )

    if any(
        window <= 0
        for window in candidate_windows
    ):
        raise ValueError(
            "Moving Average windows must be greater than zero."
        )

    if len(
        set(candidate_windows)
    ) != len(
        candidate_windows
    ):
        raise ValueError(
            "Moving Average windows must be unique."
        )

    splits = split_by_date(
        dataframe,
        train_end=train_end,
        validation_end=validation_end,
    )

    history = pd.concat(
        [
            splits.train,
            splits.validation,
        ],
        ignore_index=True,
    )

    history = history.sort_values(
        by=[
            PRODUCT_COLUMN,
            DATE_COLUMN,
        ],
        kind="stable",
    ).reset_index(drop=True)

    frames: list[pd.DataFrame] = []

    for product_sku, group in history.groupby(
        PRODUCT_COLUMN,
        sort=True,
    ):
        group = (
            group
            .sort_values(
                DATE_COLUMN,
                kind="stable",
            )
            .reset_index(drop=True)
        )

        validation_mask = (
            group[DATE_COLUMN]
            > splits.train_end
        ) & (
            group[DATE_COLUMN]
            <= splits.validation_end
        )

        for window in candidate_windows:
            moving_average = (
                group[TARGET_COLUMN]
                .shift(1)
                .rolling(
                    window=window,
                    min_periods=window,
                )
                .mean()
            )

            result = group.loc[
                validation_mask,
                [
                    DATE_COLUMN,
                    TARGET_COLUMN,
                ],
            ].copy()

            result[
                PRODUCT_COLUMN
            ] = str(product_sku)

            result[
                "model"
            ] = "moving_average"

            result[
                "window"
            ] = window

            result[
                "prediction"
            ] = moving_average.loc[
                validation_mask
            ].to_numpy()

            result = result.rename(
                columns={
                    TARGET_COLUMN: "actual",
                }
            )

            frames.append(
                result[
                    [
                        PRODUCT_COLUMN,
                        DATE_COLUMN,
                        "model",
                        "window",
                        "actual",
                        "prediction",
                    ]
                ]
            )

    predictions = pd.concat(
        frames,
        ignore_index=True,
    )

    if predictions[
        "prediction"
    ].isna().any():
        invalid_windows = (
            predictions.loc[
                predictions[
                    "prediction"
                ].isna(),
                "window",
            ]
            .drop_duplicates()
            .sort_values()
            .tolist()
        )

        raise ValueError(
            "Insufficient history for Moving Average windows: "
            + ", ".join(
                str(window)
                for window in invalid_windows
            )
        )

    return (
        predictions
        .sort_values(
            by=[
                "window",
                PRODUCT_COLUMN,
                DATE_COLUMN,
            ],
            kind="stable",
        )
        .reset_index(drop=True)
    )