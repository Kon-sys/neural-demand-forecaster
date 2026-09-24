from __future__ import annotations

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


def build_naive_validation_predictions(
    dataframe: pd.DataFrame,
    *,
    train_end: str | pd.Timestamp,
    validation_end: str | pd.Timestamp,
) -> pd.DataFrame:
    """
    Build rolling one-step-ahead naive predictions.

    Formula:

        prediction(t) = actual(t - 1)

    The current target value is never used to predict itself.
    """

    validate_processed_dataframe(
        dataframe
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

        predictions = (
            group[TARGET_COLUMN]
            .shift(1)
        )

        validation_mask = (
            group[DATE_COLUMN]
            > splits.train_end
        ) & (
            group[DATE_COLUMN]
            <= splits.validation_end
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

        result["model"] = "naive"
        result["window"] = 1

        result["prediction"] = (
            predictions.loc[
                validation_mask
            ].to_numpy()
        )

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

    predictions_frame = pd.concat(
        frames,
        ignore_index=True,
    )

    if predictions_frame[
        "prediction"
    ].isna().any():
        raise ValueError(
            "Naive baseline produced missing predictions."
        )

    return (
        predictions_frame
        .sort_values(
            by=[
                PRODUCT_COLUMN,
                DATE_COLUMN,
            ],
            kind="stable",
        )
        .reset_index(drop=True)
    )