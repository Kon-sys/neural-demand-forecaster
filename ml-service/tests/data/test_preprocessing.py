from __future__ import annotations

import pandas as pd
import pytest

from demand_forecast_ml.data.anomalies import (
    detect_quantity_anomalies,
)
from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    IMPUTED_COLUMN,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from demand_forecast_ml.data.preprocessing import (
    SCALED_TARGET_COLUMN,
    build_partition_windows,
    prepare_scaled_partitions,
)


def _create_dataset() -> pd.DataFrame:
    dates = pd.date_range(
        "2026-01-01",
        "2026-01-10",
        freq="D",
    )

    return pd.DataFrame(
        {
            PRODUCT_COLUMN: (
                ["SKU-001"] * 10
            ),
            DATE_COLUMN: dates,
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
            IMPUTED_COLUMN: (
                [False] * 10
            ),
        }
    )


def test_scaler_is_fitted_only_on_train() -> None:
    dataframe = _create_dataset()

    prepared = prepare_scaled_partitions(
        dataframe,
        train_end="2026-01-05",
        validation_end="2026-01-08",
    )

    assert prepared.scaler.min_value == 1
    assert prepared.scaler.max_value == 5

    validation_last = (
        prepared.validation[
            SCALED_TARGET_COLUMN
        ].iloc[-1]
    )

    assert validation_last > 1.0


def test_inverse_transform_restores_quantity() -> None:
    dataframe = _create_dataset()

    prepared = prepare_scaled_partitions(
        dataframe,
        train_end="2026-01-05",
        validation_end="2026-01-08",
    )

    scaled = (
        prepared.scaler.transform_value(
            4
        )
    )

    restored = (
        prepared.scaler
        .inverse_transform_value(
            scaled
        )
    )

    assert restored == pytest.approx(
        4.0
    )


def test_window_contains_only_past_values() -> None:
    dataframe = _create_dataset()

    prepared = prepare_scaled_partitions(
        dataframe,
        train_end="2026-01-05",
        validation_end="2026-01-08",
    )

    windows = build_partition_windows(
        prepared,
        window_size=3,
    )

    first_validation = (
        windows.validation[0]
    )

    assert first_validation.target_date == (
        pd.Timestamp("2026-01-06")
    )

    expected_inputs = tuple(
        prepared.scaler.transform_value(
            value
        )
        for value in (
            3,
            4,
            5,
        )
    )

    assert first_validation.inputs == (
        pytest.approx(
            expected_inputs
        )
    )

    assert first_validation.target == (
        pytest.approx(
            prepared.scaler
            .transform_value(6)
        )
    )


def test_anomaly_detection_does_not_modify_source() -> None:
    dataframe = pd.DataFrame(
        {
            PRODUCT_COLUMN: (
                ["SKU-001"] * 9
            ),
            DATE_COLUMN: pd.date_range(
                "2026-01-01",
                periods=9,
                freq="D",
            ),
            TARGET_COLUMN: [
                10,
                11,
                10,
                12,
                11,
                10,
                12,
                11,
                1000,
            ],
            IMPUTED_COLUMN: (
                [False] * 9
            ),
        }
    )

    original = dataframe.copy(
        deep=True
    )

    anomalies = detect_quantity_anomalies(
        dataframe
    )

    assert len(anomalies) == 1

    assert anomalies.iloc[0][
        TARGET_COLUMN
    ] == 1000

    assert anomalies.iloc[0][
        "direction"
    ] == "HIGH"

    pd.testing.assert_frame_equal(
        dataframe,
        original,
    )