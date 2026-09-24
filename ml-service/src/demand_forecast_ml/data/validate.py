from __future__ import annotations

import math
from dataclasses import dataclass

import pandas as pd

from .contract import (
    DATE_COLUMN,
    IMPUTED_COLUMN,
    PROCESSED_COLUMNS,
    PRODUCT_COLUMN,
    RAW_COLUMNS,
    TARGET_COLUMN,
    UNIQUE_KEY,
)


class DatasetValidationError(ValueError):
    """Raised when a dataset violates the ML data contract."""


@dataclass(frozen=True, slots=True)
class DatasetSummary:
    """Basic structural information about a validated dataset."""

    rows: int
    products: int
    min_date: pd.Timestamp
    max_date: pd.Timestamp


def _validate_exact_columns(
    dataframe: pd.DataFrame,
    expected_columns: tuple[str, ...],
) -> None:
    actual_columns = tuple(dataframe.columns)

    missing_columns = [
        column
        for column in expected_columns
        if column not in actual_columns
    ]

    unexpected_columns = [
        column
        for column in actual_columns
        if column not in expected_columns
    ]

    errors: list[str] = []

    if missing_columns:
        errors.append(
            f"Missing required columns: {', '.join(missing_columns)}."
        )

    if unexpected_columns:
        errors.append(
            f"Unexpected columns: {', '.join(unexpected_columns)}."
        )

    if errors:
        raise DatasetValidationError(
            " ".join(errors)
        )


def _validate_not_empty(
    dataframe: pd.DataFrame,
) -> None:
    if dataframe.empty:
        raise DatasetValidationError(
            "Dataset must not be empty."
        )


def _validate_product_sku(
    dataframe: pd.DataFrame,
) -> None:
    product_series = dataframe[
        PRODUCT_COLUMN
    ]

    if product_series.isna().any():
        raise DatasetValidationError(
            f"Column '{PRODUCT_COLUMN}' contains null values."
        )

    normalized = (
        product_series
        .astype(str)
        .str.strip()
    )

    if normalized.eq("").any():
        raise DatasetValidationError(
            f"Column '{PRODUCT_COLUMN}' contains blank values."
        )


def _parse_dates(
    dataframe: pd.DataFrame,
) -> pd.Series:
    parsed_dates = pd.to_datetime(
        dataframe[
            DATE_COLUMN
        ],
        errors="coerce",
    )

    if parsed_dates.isna().any():
        invalid_rows = dataframe.index[
            parsed_dates.isna()
        ].tolist()

        raise DatasetValidationError(
            f"Column '{DATE_COLUMN}' contains invalid dates "
            f"at rows: {invalid_rows}."
        )

    return parsed_dates


def _parse_quantities(
    dataframe: pd.DataFrame,
) -> pd.Series:
    quantities = pd.to_numeric(
        dataframe[
            TARGET_COLUMN
        ],
        errors="coerce",
    )

    if quantities.isna().any():
        invalid_rows = dataframe.index[
            quantities.isna()
        ].tolist()

        raise DatasetValidationError(
            f"Column '{TARGET_COLUMN}' contains non-numeric or null values "
            f"at rows: {invalid_rows}."
        )

    finite_mask = quantities.map(
        math.isfinite
    )

    if not finite_mask.all():
        invalid_rows = dataframe.index[
            ~finite_mask
        ].tolist()

        raise DatasetValidationError(
            f"Column '{TARGET_COLUMN}' must contain finite numeric values. "
            f"Invalid rows: {invalid_rows}."
        )

    negative_mask = quantities.lt(0)

    if negative_mask.any():
        invalid_rows = dataframe.index[
            negative_mask
        ].tolist()

        raise DatasetValidationError(
            f"Column '{TARGET_COLUMN}' must be greater than or equal to zero. "
            f"Negative values found at rows: {invalid_rows}."
        )

    return quantities.astype(
        "float64"
    )


def _validate_unique_key(
    dataframe: pd.DataFrame,
    parsed_dates: pd.Series,
) -> None:
    key_frame = pd.DataFrame(
        {
            PRODUCT_COLUMN: (
                dataframe[
                    PRODUCT_COLUMN
                ]
                .astype(str)
                .str.strip()
            ),
            DATE_COLUMN: parsed_dates,
        },
        index=dataframe.index,
    )

    duplicate_mask = key_frame.duplicated(
        subset=list(
            UNIQUE_KEY
        ),
        keep=False,
    )

    if duplicate_mask.any():
        duplicate_rows = dataframe.index[
            duplicate_mask
        ].tolist()

        raise DatasetValidationError(
            "Duplicate product/date observations detected. "
            f"Rows: {duplicate_rows}."
        )


def _validate_imputed_column(
    dataframe: pd.DataFrame,
) -> None:
    values = dataframe[
        IMPUTED_COLUMN
    ]

    valid_boolean_mask = values.map(
        lambda value: isinstance(
            value,
            bool,
        )
    )

    if not valid_boolean_mask.all():
        invalid_rows = dataframe.index[
            ~valid_boolean_mask
        ].tolist()

        raise DatasetValidationError(
            f"Column '{IMPUTED_COLUMN}' must contain boolean values only. "
            f"Invalid rows: {invalid_rows}."
        )


def _validate_imputed_quantities(
    dataframe: pd.DataFrame,
    quantities: pd.Series,
) -> None:
    invalid_mask = (
        dataframe[
            IMPUTED_COLUMN
        ]
        & quantities.ne(0)
    )

    if invalid_mask.any():
        invalid_rows = dataframe.index[
            invalid_mask
        ].tolist()

        raise DatasetValidationError(
            "Rows marked as imputed must have quantity = 0. "
            f"Invalid rows: {invalid_rows}."
        )


def _validate_chronological_order(
    dataframe: pd.DataFrame,
    parsed_dates: pd.Series,
) -> None:
    validation_frame = pd.DataFrame(
        {
            PRODUCT_COLUMN: (
                dataframe[
                    PRODUCT_COLUMN
                ]
                .astype(str)
                .str.strip()
            ),
            DATE_COLUMN: parsed_dates,
        },
        index=dataframe.index,
    )

    for product_sku, group in validation_frame.groupby(
        PRODUCT_COLUMN,
        sort=False,
    ):
        if not group[
            DATE_COLUMN
        ].is_monotonic_increasing:
            raise DatasetValidationError(
                "Processed dataset must be ordered chronologically "
                f"within product '{product_sku}'."
            )


def _validate_daily_continuity(
    dataframe: pd.DataFrame,
    parsed_dates: pd.Series,
) -> None:
    validation_frame = pd.DataFrame(
        {
            PRODUCT_COLUMN: (
                dataframe[
                    PRODUCT_COLUMN
                ]
                .astype(str)
                .str.strip()
            ),
            DATE_COLUMN: parsed_dates,
        },
        index=dataframe.index,
    )

    for product_sku, group in validation_frame.groupby(
        PRODUCT_COLUMN,
        sort=False,
    ):
        dates = group[
            DATE_COLUMN
        ].sort_values()

        if len(
            dates
        ) < 2:
            continue

        differences = (
            dates
            .diff()
            .dropna()
        )

        invalid_differences = differences.ne(
            pd.Timedelta(
                days=1
            )
        )

        if invalid_differences.any():
            raise DatasetValidationError(
                "Processed dataset must contain a continuous daily calendar "
                f"for product '{product_sku}'."
            )


def _build_summary(
    dataframe: pd.DataFrame,
    parsed_dates: pd.Series,
) -> DatasetSummary:
    return DatasetSummary(
        rows=len(
            dataframe
        ),
        products=(
            dataframe[
                PRODUCT_COLUMN
            ]
            .astype(str)
            .str.strip()
            .nunique()
        ),
        min_date=parsed_dates.min(),
        max_date=parsed_dates.max(),
    )


def validate_raw_dataframe(
    dataframe: pd.DataFrame,
) -> DatasetSummary:
    """
    Validate a raw demand dataset.

    Expected columns:
        product_sku
        date
        quantity

    quantity may contain integer or fractional non-negative
    finite numeric values.

    The function does not modify the supplied DataFrame.
    """

    _validate_not_empty(
        dataframe
    )

    _validate_exact_columns(
        dataframe,
        RAW_COLUMNS,
    )

    _validate_product_sku(
        dataframe
    )

    parsed_dates = _parse_dates(
        dataframe
    )

    _parse_quantities(
        dataframe
    )

    _validate_unique_key(
        dataframe,
        parsed_dates,
    )

    return _build_summary(
        dataframe,
        parsed_dates,
    )


def validate_processed_dataframe(
    dataframe: pd.DataFrame,
) -> DatasetSummary:
    """
    Validate a processed daily demand dataset.

    Expected columns:
        product_sku
        date
        quantity
        is_imputed

    The function does not modify the supplied DataFrame.
    """

    _validate_not_empty(
        dataframe
    )

    _validate_exact_columns(
        dataframe,
        PROCESSED_COLUMNS,
    )

    _validate_product_sku(
        dataframe
    )

    parsed_dates = _parse_dates(
        dataframe
    )

    quantities = _parse_quantities(
        dataframe
    )

    _validate_unique_key(
        dataframe,
        parsed_dates,
    )

    _validate_imputed_column(
        dataframe
    )

    _validate_imputed_quantities(
        dataframe,
        quantities,
    )

    _validate_chronological_order(
        dataframe,
        parsed_dates,
    )

    _validate_daily_continuity(
        dataframe,
        parsed_dates,
    )

    return _build_summary(
        dataframe,
        parsed_dates,
    )