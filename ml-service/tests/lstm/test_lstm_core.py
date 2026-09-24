from __future__ import annotations

import pandas as pd
import pytest
import torch

from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    IMPUTED_COLUMN,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from demand_forecast_ml.data.preprocessing import (
    SCALED_TARGET_COLUMN,
)
from demand_forecast_ml.lstm.config import (
    LSTMConfig,
)
from demand_forecast_ml.lstm.dataset import (
    build_lstm_datasets,
)
from demand_forecast_ml.lstm.model import (
    DemandLSTM,
    count_trainable_parameters,
)
from demand_forecast_ml.lstm.scaling import (
    SeriesScalerRegistry,
    prepare_lstm_partitions,
)


def _create_dataset() -> pd.DataFrame:
    dates = pd.date_range(
        "2024-01-01",
        periods=12,
        freq="D",
    )

    first_product = pd.DataFrame(
        {
            PRODUCT_COLUMN: (
                ["SKU-A"] * 12
            ),
            DATE_COLUMN: dates,
            TARGET_COLUMN: [
                float(value)
                for value in range(
                    1,
                    13,
                )
            ],
            IMPUTED_COLUMN: (
                [False] * 12
            ),
        }
    )

    second_product = pd.DataFrame(
        {
            PRODUCT_COLUMN: (
                ["SKU-B"] * 12
            ),
            DATE_COLUMN: dates,
            TARGET_COLUMN: [
                float(
                    value * 10
                )
                for value in range(
                    1,
                    13,
                )
            ],
            IMPUTED_COLUMN: (
                [False] * 12
            ),
        }
    )

    return (
        pd.concat(
            [
                first_product,
                second_product,
            ],
            ignore_index=True,
        )
        .sort_values(
            by=[
                PRODUCT_COLUMN,
                DATE_COLUMN,
            ]
        )
        .reset_index(
            drop=True
        )
    )


def test_scalers_are_fitted_independently_per_series() -> None:
    dataframe = (
        _create_dataset()
    )

    partitions = (
        prepare_lstm_partitions(
            dataframe,
            train_end="2024-01-08",
            validation_end="2024-01-10",
        )
    )

    first_scaler = (
        partitions.scalers.get(
            "SKU-A"
        )
    )

    second_scaler = (
        partitions.scalers.get(
            "SKU-B"
        )
    )

    assert (
        first_scaler.min_value
        == pytest.approx(
            1.0
        )
    )

    assert (
        first_scaler.max_value
        == pytest.approx(
            8.0
        )
    )

    assert (
        second_scaler.min_value
        == pytest.approx(
            10.0
        )
    )

    assert (
        second_scaler.max_value
        == pytest.approx(
            80.0
        )
    )


def test_validation_does_not_affect_scaler() -> None:
    dataframe = (
        _create_dataset()
    )

    partitions = (
        prepare_lstm_partitions(
            dataframe,
            train_end="2024-01-08",
            validation_end="2024-01-10",
        )
    )

    sku_a_validation = (
        partitions.validation.loc[
            partitions.validation[
                PRODUCT_COLUMN
            ].eq(
                "SKU-A"
            )
        ]
    )

    assert (
        sku_a_validation[
            SCALED_TARGET_COLUMN
        ].max()
        > 1.0
    )


def test_scaler_registry_can_be_saved_and_loaded(
    tmp_path,
) -> None:
    dataframe = (
        _create_dataset()
    )

    train = dataframe.loc[
        dataframe[
            DATE_COLUMN
        ]
        <= pd.Timestamp(
            "2024-01-08"
        )
    ].copy()

    registry = (
        SeriesScalerRegistry.fit(
            train
        )
    )

    path = (
        tmp_path
        / "scalers.json"
    )

    registry.save(
        path
    )

    restored = (
        SeriesScalerRegistry.load(
            path
        )
    )

    assert (
        restored.get(
            "SKU-A"
        ).min_value
        == pytest.approx(
            1.0
        )
    )

    assert (
        restored.get(
            "SKU-B"
        ).max_value
        == pytest.approx(
            80.0
        )
    )


def test_lstm_dataset_shapes_are_correct() -> None:
    dataframe = (
        _create_dataset()
    )

    partitions = (
        prepare_lstm_partitions(
            dataframe,
            train_end="2024-01-08",
            validation_end="2024-01-10",
        )
    )

    datasets = build_lstm_datasets(
        partitions,
        window_size=3,
    )

    inputs, target = (
        datasets.train[0]
    )

    assert inputs.shape == (
        3,
        1,
    )

    assert target.shape == (
        1,
    )

    assert inputs.dtype == (
        torch.float32
    )

    assert target.dtype == (
        torch.float32
    )


def test_validation_targets_are_in_validation_period() -> None:
    dataframe = (
        _create_dataset()
    )

    partitions = (
        prepare_lstm_partitions(
            dataframe,
            train_end="2024-01-08",
            validation_end="2024-01-10",
        )
    )

    datasets = build_lstm_datasets(
        partitions,
        window_size=3,
    )

    dates = [
        datasets.validation.metadata(
            index
        ).target_date
        for index in range(
            len(
                datasets.validation
            )
        )
    ]

    assert min(
        dates
    ) == pd.Timestamp(
        "2024-01-09"
    )

    assert max(
        dates
    ) == pd.Timestamp(
        "2024-01-10"
    )


def test_model_forward_shape() -> None:
    config = LSTMConfig(
        window_size=14,
        hidden_size=16,
        num_layers=2,
        dropout=0.1,
    )

    model = DemandLSTM(
        config
    )

    batch = torch.randn(
        8,
        14,
        1,
    )

    prediction = model(
        batch
    )

    assert prediction.shape == (
        8,
        1,
    )

    assert (
        count_trainable_parameters(
            model
        )
        > 0
    )


def test_model_rejects_invalid_tensor_shape() -> None:
    config = LSTMConfig()

    model = DemandLSTM(
        config
    )

    invalid = torch.randn(
        14,
        1,
    )

    with pytest.raises(
        ValueError,
        match=(
            "LSTM input must have shape"
        ),
    ):
        model(
            invalid
        )