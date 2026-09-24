from __future__ import annotations

import pandas as pd
import pytest

from demand_forecast_ml.data.contract import (
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from demand_forecast_ml.data.freshretail_adapter import (
    convert_selected_dataset,
    select_series,
)


def _build_source(
    *,
    start: str,
    periods: int,
) -> pd.DataFrame:
    dates = pd.date_range(
        start,
        periods=periods,
        freq="D",
    )

    rows: list[
        dict[str, object]
    ] = []

    series = [
        (1, 101, 10, 5.0),
        (1, 102, 10, 4.0),
        (1, 103, 10, 1.0),
        (2, 201, 20, 6.0),
        (2, 202, 20, 5.0),
        (2, 203, 20, 1.0),
    ]

    for (
        store_id,
        product_id,
        category_id,
        base_sales,
    ) in series:
        for index, date in enumerate(
            dates
        ):
            rows.append(
                {
                    "city_id": 1,
                    "store_id": store_id,
                    "management_group_id": 1,
                    "first_category_id": category_id,
                    "second_category_id": category_id * 10,
                    "third_category_id": category_id * 100,
                    "product_id": product_id,
                    "dt": date,
                    "sale_amount": (
                        base_sales
                        + index * 0.1
                    ),
                }
            )

    return pd.DataFrame(
        rows
    )


def test_select_series_is_balanced_by_first_category() -> None:
    train = _build_source(
        start="2024-01-01",
        periods=5,
    )

    selected = select_series(
        train,
        series_count=4,
    )

    counts = (
        selected[
            "first_category_id"
        ]
        .value_counts()
        .to_dict()
    )

    assert counts == {
        10: 2,
        20: 2,
    }


def test_fractional_sales_are_preserved() -> None:
    train = _build_source(
        start="2024-01-01",
        periods=3,
    )

    evaluation = (
        _build_source(
            start="2024-01-04",
            periods=2,
        )
    )

    selected = select_series(
        train,
        series_count=2,
    )

    processed = (
        convert_selected_dataset(
            train,
            evaluation,
            selected,
        )
    )

    assert (
        processed[
            TARGET_COLUMN
        ].dtype
        == "float64"
    )

    assert any(
        processed[
            TARGET_COLUMN
        ].mod(
            1
        ).ne(
            0
        )
    )

    assert (
        processed[
            PRODUCT_COLUMN
        ]
        .str.startswith(
            "STORE_"
        )
        .all()
    )


def test_train_and_eval_must_be_consecutive() -> None:
    train = _build_source(
        start="2024-01-01",
        periods=3,
    )

    evaluation = (
        _build_source(
            start="2024-01-05",
            periods=2,
        )
    )

    selected = select_series(
        train,
        series_count=2,
    )

    with pytest.raises(
        ValueError,
        match=(
            "must be consecutive"
        ),
    ):
        convert_selected_dataset(
            train,
            evaluation,
            selected,
        )