from __future__ import annotations

import pandas as pd

from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    PRODUCT_COLUMN,
    RAW_COLUMNS,
    TARGET_COLUMN,
)
from demand_forecast_ml.data.generate_dataset import (
    generate_synthetic_sales,
)
from demand_forecast_ml.data.validate import (
    validate_raw_dataframe,
)


def test_generator_creates_expected_structure() -> None:
    dataframe = generate_synthetic_sales(
        start_date="2026-01-01",
        end_date="2026-01-10",
        product_count=3,
        seed=42,
    )

    assert list(dataframe.columns) == list(RAW_COLUMNS)
    assert len(dataframe) == 30
    assert dataframe[PRODUCT_COLUMN].nunique() == 3


def test_generated_dataset_is_valid() -> None:
    dataframe = generate_synthetic_sales(
        start_date="2026-01-01",
        end_date="2026-01-31",
        product_count=2,
        seed=42,
    )

    summary = validate_raw_dataframe(dataframe)

    assert summary.rows == 62
    assert summary.products == 2

    assert dataframe[TARGET_COLUMN].ge(0).all()


def test_generator_is_reproducible() -> None:
    first = generate_synthetic_sales(
        start_date="2026-01-01",
        end_date="2026-01-10",
        product_count=2,
        seed=42,
    )

    second = generate_synthetic_sales(
        start_date="2026-01-01",
        end_date="2026-01-10",
        product_count=2,
        seed=42,
    )

    pd.testing.assert_frame_equal(
        first,
        second,
    )


def test_each_product_has_continuous_daily_raw_history() -> None:
    dataframe = generate_synthetic_sales(
        start_date="2026-01-01",
        end_date="2026-01-10",
        product_count=2,
        seed=42,
    )

    for _, product_data in dataframe.groupby(
        PRODUCT_COLUMN,
    ):
        dates = pd.to_datetime(
            product_data[DATE_COLUMN]
        ).sort_values()

        differences = dates.diff().dropna()

        assert differences.eq(
            pd.Timedelta(days=1)
        ).all()