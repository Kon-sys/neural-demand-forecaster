from __future__ import annotations

import pandas as pd
import torch

from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    IMPUTED_COLUMN,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from demand_forecast_ml.lstm.config import (
    LSTMConfig,
)
from demand_forecast_ml.lstm.dataset import (
    build_lstm_datasets,
)
from demand_forecast_ml.lstm.inference import (
    predict_dataset,
)
from demand_forecast_ml.lstm.model import (
    DemandLSTM,
)
from demand_forecast_ml.lstm.scaling import (
    prepare_lstm_partitions,
)


def test_original_zero_ground_truth_is_preserved_exactly() -> None:
    dates = pd.date_range(
        "2024-01-01",
        periods=12,
        freq="D",
    )

    dataframe = pd.DataFrame(
        {
            PRODUCT_COLUMN: (
                ["SKU-A"] * 12
            ),
            DATE_COLUMN: dates,
            TARGET_COLUMN: [
                1.0,
                2.0,
                3.0,
                4.0,
                5.0,
                6.0,
                7.0,
                8.0,
                0.0,
                9.0,
                10.0,
                11.0,
            ],
            IMPUTED_COLUMN: (
                [False] * 12
            ),
        }
    )

    partitions = (
        prepare_lstm_partitions(
            dataframe,
            train_end="2024-01-08",
            validation_end="2024-01-10",
        )
    )

    datasets = (
        build_lstm_datasets(
            partitions,
            window_size=3,
        )
    )

    zero_index = next(
        index
        for index in range(
            len(
                datasets.validation
            )
        )
        if (
            datasets.validation.metadata(
                index
            ).target_date
            == pd.Timestamp(
                "2024-01-09"
            )
        )
    )

    metadata = (
        datasets.validation.metadata(
            zero_index
        )
    )

    assert metadata.actual == 0.0

    _, scaled_target = (
        datasets.validation[
            zero_index
        ]
    )

    assert float(
        scaled_target.item()
    ) < 0.0

    config = LSTMConfig(
        window_size=3,
        hidden_size=8,
        num_layers=1,
        dropout=0.0,
    )

    model = DemandLSTM(
        config
    )

    predictions = (
        predict_dataset(
            model=model,
            dataset=(
                datasets.validation
            ),
            scalers=(
                partitions.scalers
            ),
            device=torch.device(
                "cpu"
            ),
            batch_size=2,
        )
    )

    row = predictions.loc[
        predictions[
            DATE_COLUMN
        ].eq(
            pd.Timestamp(
                "2024-01-09"
            )
        )
    ].iloc[0]

    assert row[
        "actual"
    ] == 0.0