from __future__ import annotations

import pandas as pd
import pytest

from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    IMPUTED_COLUMN,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from demand_forecast_ml.data.split import (
    DatasetSplitError,
    split_by_date,
)


def _create_dataset() -> pd.DataFrame:
    dates = pd.date_range(
        "2026-01-01",
        "2026-01-10",
        freq="D",
    )

    return pd.DataFrame(
        {
            PRODUCT_COLUMN: ["SKU-001"] * len(dates),
            DATE_COLUMN: dates,
            TARGET_COLUMN: list(
                range(1, len(dates) + 1)
            ),
            IMPUTED_COLUMN: [False] * len(dates),
        }
    )


def test_split_by_date_is_chronological() -> None:
    dataframe = _create_dataset()

    splits = split_by_date(
        dataframe,
        train_end="2026-01-05",
        validation_end="2026-01-08",
    )

    assert len(splits.train) == 5
    assert len(splits.validation) == 3
    assert len(splits.test) == 2

    assert (
        splits.train[DATE_COLUMN].max()
        < splits.validation[DATE_COLUMN].min()
    )

    assert (
        splits.validation[DATE_COLUMN].max()
        < splits.test[DATE_COLUMN].min()
    )


def test_split_contains_every_original_row_once() -> None:
    dataframe = _create_dataset()

    splits = split_by_date(
        dataframe,
        train_end="2026-01-05",
        validation_end="2026-01-08",
    )

    total_rows = (
        len(splits.train)
        + len(splits.validation)
        + len(splits.test)
    )

    assert total_rows == len(dataframe)


def test_split_rejects_invalid_cutoff_order() -> None:
    dataframe = _create_dataset()

    with pytest.raises(
        DatasetSplitError,
        match="train_end must be earlier",
    ):
        split_by_date(
            dataframe,
            train_end="2026-01-08",
            validation_end="2026-01-05",
        )


def test_split_rejects_empty_partition() -> None:
    dataframe = _create_dataset()

    with pytest.raises(
        DatasetSplitError,
        match="empty partition",
    ):
        split_by_date(
            dataframe,
            train_end="2025-12-01",
            validation_end="2026-01-05",
        )