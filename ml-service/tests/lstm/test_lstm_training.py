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
from demand_forecast_ml.lstm.checkpoint import (
    load_checkpoint,
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
from demand_forecast_ml.lstm.scaling import (
    prepare_lstm_partitions,
)
from demand_forecast_ml.lstm.training import (
    build_data_loaders,
    train_lstm,
)


def _create_dataset() -> pd.DataFrame:
    dates = pd.date_range(
        "2024-01-01",
        periods=20,
        freq="D",
    )

    frames = []

    for (
        product_sku,
        multiplier,
    ) in [
        (
            "SKU-A",
            1.0,
        ),
        (
            "SKU-B",
            2.0,
        ),
    ]:
        frames.append(
            pd.DataFrame(
                {
                    PRODUCT_COLUMN: (
                        [product_sku]
                        * len(
                            dates
                        )
                    ),
                    DATE_COLUMN: (
                        dates
                    ),
                    TARGET_COLUMN: [
                        (
                            1.0
                            + index
                            * 0.1
                        )
                        * multiplier
                        for index in range(
                            len(
                                dates
                            )
                        )
                    ],
                    IMPUTED_COLUMN: (
                        [False]
                        * len(
                            dates
                        )
                    ),
                }
            )
        )

    return (
        pd.concat(
            frames,
            ignore_index=True,
        )
        .sort_values(
            [
                PRODUCT_COLUMN,
                DATE_COLUMN,
            ]
        )
        .reset_index(
            drop=True
        )
    )


def _prepare():
    dataframe = (
        _create_dataset()
    )

    partitions = (
        prepare_lstm_partitions(
            dataframe,
            train_end="2024-01-14",
            validation_end="2024-01-18",
        )
    )

    datasets = (
        build_lstm_datasets(
            partitions,
            window_size=4,
        )
    )

    return (
        partitions,
        datasets,
    )


def test_data_loaders_return_expected_batch_shapes() -> None:
    _, datasets = _prepare()

    config = LSTMConfig(
        window_size=4,
        hidden_size=8,
        num_layers=1,
        dropout=0.0,
        batch_size=4,
        max_epochs=2,
        early_stopping_patience=2,
    )

    train_loader, _ = (
        build_data_loaders(
            datasets,
            config=config,
        )
    )

    inputs, targets = next(
        iter(
            train_loader
        )
    )

    assert inputs.ndim == 3
    assert inputs.shape[1:] == (
        4,
        1,
    )

    assert targets.ndim == 2
    assert targets.shape[1] == 1


def test_training_saves_and_loads_best_checkpoint(
    tmp_path,
) -> None:
    _, datasets = _prepare()

    config = LSTMConfig(
        window_size=4,
        hidden_size=8,
        num_layers=1,
        dropout=0.0,
        batch_size=4,
        learning_rate=0.01,
        max_epochs=3,
        early_stopping_patience=3,
        random_seed=42,
    )

    checkpoint_path = (
        tmp_path
        / "model.pt"
    )

    result = train_lstm(
        datasets=datasets,
        config=config,
        checkpoint_path=(
            checkpoint_path
        ),
        device=torch.device(
            "cpu"
        ),
        verbose=False,
    )

    assert checkpoint_path.exists()

    assert result.best_epoch >= 1

    loaded = load_checkpoint(
        checkpoint_path,
        device=torch.device(
            "cpu"
        ),
    )

    assert (
        loaded.config.window_size
        == 4
    )

    assert (
        loaded.config.hidden_size
        == 8
    )

    assert (
        loaded.epoch
        == result.best_epoch
    )


def test_validation_predictions_are_inverse_transformed(
    tmp_path,
) -> None:
    (
        partitions,
        datasets,
    ) = _prepare()

    config = LSTMConfig(
        window_size=4,
        hidden_size=8,
        num_layers=1,
        dropout=0.0,
        batch_size=4,
        learning_rate=0.01,
        max_epochs=2,
        early_stopping_patience=2,
        random_seed=42,
    )

    checkpoint_path = (
        tmp_path
        / "model.pt"
    )

    train_lstm(
        datasets=datasets,
        config=config,
        checkpoint_path=(
            checkpoint_path
        ),
        device=torch.device(
            "cpu"
        ),
        verbose=False,
    )

    loaded = load_checkpoint(
        checkpoint_path,
        device=torch.device(
            "cpu"
        ),
    )

    predictions = (
        predict_dataset(
            model=loaded.model,
            dataset=(
                datasets.validation
            ),
            scalers=(
                partitions.scalers
            ),
            device=torch.device(
                "cpu"
            ),
            batch_size=4,
        )
    )

    assert len(
        predictions
    ) == len(
        datasets.validation
    )

    assert predictions[
        "prediction"
    ].ge(
        0
    ).all()

    assert predictions[
        "actual"
    ].gt(
        1.0
    ).all()

    assert predictions[
        "actual"
    ].notna().all()

    assert predictions[
        "prediction"
    ].notna().all()


def test_loaded_model_produces_same_prediction(
    tmp_path,
) -> None:
    _, datasets = _prepare()

    config = LSTMConfig(
        window_size=4,
        hidden_size=8,
        num_layers=1,
        dropout=0.0,
        batch_size=4,
        max_epochs=2,
        early_stopping_patience=2,
        random_seed=42,
    )

    checkpoint_path = (
        tmp_path
        / "model.pt"
    )

    train_lstm(
        datasets=datasets,
        config=config,
        checkpoint_path=(
            checkpoint_path
        ),
        device=torch.device(
            "cpu"
        ),
        verbose=False,
    )

    first = load_checkpoint(
        checkpoint_path,
        device=torch.device(
            "cpu"
        ),
    )

    second = load_checkpoint(
        checkpoint_path,
        device=torch.device(
            "cpu"
        ),
    )

    inputs, _ = (
        datasets.validation[0]
    )

    batch = inputs.unsqueeze(
        0
    )

    with torch.no_grad():
        first_prediction = (
            first.model(
                batch
            )
        )

        second_prediction = (
            second.model(
                batch
            )
        )

    assert torch.allclose(
        first_prediction,
        second_prediction,
    )