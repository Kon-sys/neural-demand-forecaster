from __future__ import annotations

import pandas as pd
import pytest

from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    IMPUTED_COLUMN,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from demand_forecast_ml.data.prepare import (
    load_raw_csv,
    prepare_daily_dataset,
    save_processed_csv,
)
from demand_forecast_ml.data.validate import (
    DatasetValidationError,
    validate_processed_dataframe,
    validate_raw_dataframe,
)


def test_prepare_daily_dataset_restores_missing_dates() -> None:
    raw = pd.DataFrame(
        {
            PRODUCT_COLUMN: [
                "SKU-001",
                "SKU-001",
                "SKU-001",
            ],
            DATE_COLUMN: [
                "2026-01-01",
                "2026-01-03",
                "2026-01-04",
            ],
            TARGET_COLUMN: [
                10,
                7,
                12,
            ],
        }
    )

    processed = prepare_daily_dataset(
        raw
    )

    assert len(
        processed
    ) == 4

    missing_day = processed.loc[
        processed[
            DATE_COLUMN
        ]
        == pd.Timestamp(
            "2026-01-02"
        )
    ].iloc[0]

    assert (
        missing_day[
            TARGET_COLUMN
        ]
        == 0.0
    )

    assert bool(
        missing_day[
            IMPUTED_COLUMN
        ]
    ) is True


def test_original_observations_are_not_marked_as_imputed() -> None:
    raw = pd.DataFrame(
        {
            PRODUCT_COLUMN: [
                "SKU-001",
                "SKU-001",
            ],
            DATE_COLUMN: [
                "2026-01-01",
                "2026-01-02",
            ],
            TARGET_COLUMN: [
                5,
                8,
            ],
        }
    )

    processed = prepare_daily_dataset(
        raw
    )

    assert (
        processed[
            IMPUTED_COLUMN
        ].tolist()
        == [
            False,
            False,
        ]
    )


def test_calendar_is_created_independently_for_each_product() -> None:
    raw = pd.DataFrame(
        {
            PRODUCT_COLUMN: [
                "SKU-001",
                "SKU-001",
                "SKU-002",
                "SKU-002",
            ],
            DATE_COLUMN: [
                "2026-01-01",
                "2026-01-03",
                "2026-01-05",
                "2026-01-07",
            ],
            TARGET_COLUMN: [
                10,
                12,
                4,
                6,
            ],
        }
    )

    processed = prepare_daily_dataset(
        raw
    )

    first_product = processed.loc[
        processed[
            PRODUCT_COLUMN
        ]
        == "SKU-001"
    ]

    second_product = processed.loc[
        processed[
            PRODUCT_COLUMN
        ]
        == "SKU-002"
    ]

    assert (
        first_product[
            DATE_COLUMN
        ].min()
        == pd.Timestamp(
            "2026-01-01"
        )
    )

    assert (
        first_product[
            DATE_COLUMN
        ].max()
        == pd.Timestamp(
            "2026-01-03"
        )
    )

    assert (
        second_product[
            DATE_COLUMN
        ].min()
        == pd.Timestamp(
            "2026-01-05"
        )
    )

    assert (
        second_product[
            DATE_COLUMN
        ].max()
        == pd.Timestamp(
            "2026-01-07"
        )
    )

    assert (
        pd.Timestamp(
            "2026-01-04"
        )
        not in second_product[
            DATE_COLUMN
        ].values
    )


def test_duplicate_product_date_is_rejected() -> None:
    raw = pd.DataFrame(
        {
            PRODUCT_COLUMN: [
                "SKU-001",
                "SKU-001",
            ],
            DATE_COLUMN: [
                "2026-01-01",
                "2026-01-01",
            ],
            TARGET_COLUMN: [
                5,
                8,
            ],
        }
    )

    with pytest.raises(
        DatasetValidationError,
        match=(
            "Duplicate product/date observations"
        ),
    ):
        validate_raw_dataframe(
            raw
        )


def test_negative_quantity_is_rejected() -> None:
    raw = pd.DataFrame(
        {
            PRODUCT_COLUMN: [
                "SKU-001",
            ],
            DATE_COLUMN: [
                "2026-01-01",
            ],
            TARGET_COLUMN: [
                -1,
            ],
        }
    )

    with pytest.raises(
        DatasetValidationError,
        match=(
            "greater than or equal to zero"
        ),
    ):
        validate_raw_dataframe(
            raw
        )


def test_fractional_quantity_is_preserved() -> None:
    raw = pd.DataFrame(
        {
            PRODUCT_COLUMN: [
                "SKU-001",
            ],
            DATE_COLUMN: [
                "2026-01-01",
            ],
            TARGET_COLUMN: [
                5.5,
            ],
        }
    )

    validate_raw_dataframe(
        raw
    )

    processed = prepare_daily_dataset(
        raw
    )

    assert (
        processed[
            TARGET_COLUMN
        ].dtype
        == "float64"
    )

    assert (
        processed.iloc[0][
            TARGET_COLUMN
        ]
        == pytest.approx(
            5.5
        )
    )


def test_infinite_quantity_is_rejected() -> None:
    raw = pd.DataFrame(
        {
            PRODUCT_COLUMN: [
                "SKU-001",
            ],
            DATE_COLUMN: [
                "2026-01-01",
            ],
            TARGET_COLUMN: [
                float(
                    "inf"
                ),
            ],
        }
    )

    with pytest.raises(
        DatasetValidationError,
        match=(
            "finite numeric values"
        ),
    ):
        validate_raw_dataframe(
            raw
        )


def test_processed_dataset_must_be_continuous() -> None:
    processed = pd.DataFrame(
        {
            PRODUCT_COLUMN: [
                "SKU-001",
                "SKU-001",
            ],
            DATE_COLUMN: pd.to_datetime(
                [
                    "2026-01-01",
                    "2026-01-03",
                ]
            ),
            TARGET_COLUMN: [
                5.0,
                7.0,
            ],
            IMPUTED_COLUMN: [
                False,
                False,
            ],
        }
    )

    with pytest.raises(
        DatasetValidationError,
        match=(
            "continuous daily calendar"
        ),
    ):
        validate_processed_dataframe(
            processed
        )


def test_imputed_row_must_have_zero_quantity() -> None:
    processed = pd.DataFrame(
        {
            PRODUCT_COLUMN: [
                "SKU-001",
            ],
            DATE_COLUMN: pd.to_datetime(
                [
                    "2026-01-01",
                ]
            ),
            TARGET_COLUMN: [
                10.0,
            ],
            IMPUTED_COLUMN: [
                True,
            ],
        }
    )

    with pytest.raises(
        DatasetValidationError,
        match="quantity = 0",
    ):
        validate_processed_dataframe(
            processed
        )


def test_csv_pipeline_can_be_saved_and_loaded(
    tmp_path,
) -> None:
    raw_path = (
        tmp_path
        / "raw.csv"
    )

    processed_path = (
        tmp_path
        / "processed.csv"
    )

    raw_path.write_text(
        (
            "product_sku,date,quantity\n"
            "SKU-001,2026-01-01,10.5\n"
            "SKU-001,2026-01-03,20.25\n"
        ),
        encoding="utf-8",
    )

    raw = load_raw_csv(
        raw_path
    )

    processed = prepare_daily_dataset(
        raw
    )

    summary = save_processed_csv(
        processed,
        processed_path,
    )

    assert (
        processed_path.exists()
    )

    assert (
        summary.rows
        == 3
    )

    assert (
        summary.products
        == 1
    )

    saved = pd.read_csv(
        processed_path
    )

    assert list(
        saved.columns
    ) == [
        PRODUCT_COLUMN,
        DATE_COLUMN,
        TARGET_COLUMN,
        IMPUTED_COLUMN,
    ]

    assert saved[
        TARGET_COLUMN
    ].tolist() == [
        10.5,
        0.0,
        20.25,
    ]