from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable

import pandas as pd


@dataclass(frozen=True, slots=True)
class RegressionMetrics:
    mae: float
    rmse: float
    mape: float | None
    observations: int
    mape_observations: int


def calculate_regression_metrics(
    actual: Iterable[float],
    predicted: Iterable[float],
) -> RegressionMetrics:
    """
    Calculate MAE, RMSE and MAPE.

    MAPE is calculated only for observations where actual != 0,
    because percentage error is undefined for a zero denominator.
    """

    actual_series = pd.Series(
        actual,
        dtype="float64",
    ).reset_index(drop=True)

    predicted_series = pd.Series(
        predicted,
        dtype="float64",
    ).reset_index(drop=True)

    if len(actual_series) != len(predicted_series):
        raise ValueError(
            "Actual and predicted series must have equal length."
        )

    if actual_series.empty:
        raise ValueError(
            "Metrics cannot be calculated for an empty dataset."
        )

    if actual_series.isna().any():
        raise ValueError(
            "Actual series contains missing values."
        )

    if predicted_series.isna().any():
        raise ValueError(
            "Predicted series contains missing values."
        )

    errors = (
        actual_series
        - predicted_series
    )

    absolute_errors = errors.abs()

    mae = float(
        absolute_errors.mean()
    )

    rmse = math.sqrt(
        float(
            errors.pow(2).mean()
        )
    )

    non_zero_mask = (
        actual_series.ne(0)
    )

    mape_observations = int(
        non_zero_mask.sum()
    )

    mape: float | None

    if mape_observations == 0:
        mape = None
    else:
        percentage_errors = (
            absolute_errors.loc[
                non_zero_mask
            ]
            / actual_series.loc[
                non_zero_mask
            ].abs()
        )

        mape = float(
            percentage_errors.mean()
            * 100.0
        )

    return RegressionMetrics(
        mae=mae,
        rmse=rmse,
        mape=mape,
        observations=len(
            actual_series
        ),
        mape_observations=(
            mape_observations
        ),
    )