from __future__ import annotations

import math

import pandas as pd
import torch

from demand_forecast_ml.lstm.config import (
    LSTMConfig,
)
from demand_forecast_ml.runtime.manager import (
    RuntimeManager,
)
from demand_forecast_ml.training.pipeline import (
    train_production_model,
)
from demand_forecast_ml.training.registry import (
    ModelRegistry,
)


def _create_training_csv(
    path,
) -> None:
    dates = pd.date_range(
        "2026-01-01",
        periods=40,
        freq="D",
    )

    rows: list[
        dict[str, object]
    ] = []

    for product_sku, multiplier in (
        ("SKU-A", 1.0),
        ("SKU-B", 2.0),
    ):
        for index, date in enumerate(
            dates
        ):
            quantity = (
                multiplier
                * (
                    5.0
                    + float(
                        index % 7
                    )
                )
            )

            rows.append(
                {
                    "product_sku": (
                        product_sku
                    ),
                    "date": (
                        date.strftime(
                            "%Y-%m-%d"
                        )
                    ),
                    "quantity": (
                        quantity
                    ),
                }
            )

    pd.DataFrame(
        rows
    ).to_csv(
        path,
        index=False,
    )


def test_real_production_training_and_activation(
    tmp_path,
) -> None:
    dataset_path = (
        tmp_path
        / "sales.csv"
    )

    _create_training_csv(
        dataset_path
    )

    registry = ModelRegistry(
        tmp_path
        / "models"
    )

    version = (
        registry.create_version()
    )

    config = LSTMConfig(
        window_size=14,
        input_size=1,
        hidden_size=8,
        num_layers=1,
        dropout=0.0,
        output_size=1,
        batch_size=16,
        learning_rate=0.001,
        max_epochs=2,
        early_stopping_patience=2,
        early_stopping_min_delta=0.0001,
        random_seed=42,
    )

    result = (
        train_production_model(
            dataset_path=(
                dataset_path
            ),
            model_version=(
                version
            ),
            config=config,
            validation_days=14,
            device=torch.device(
                "cpu"
            ),
        )
    )

    assert (
        result.series_count
        == 2
    )

    assert (
        result.rows
        == 80
    )

    assert (
        result.train_samples
        > 0
    )

    assert (
        result.validation_samples
        == 28
    )

    assert (
        result.epochs_completed
        >= 1
    )

    assert math.isfinite(
        result.mae
    )

    assert math.isfinite(
        result.rmse
    )

    assert (
        version.checkpoint_path
        .exists()
    )

    assert (
        version.scalers_path
        .exists()
    )

    assert (
        version.metadata_path
        .exists()
    )

    assert (
        version.metrics_path
        .exists()
    )

    assert registry.exists(
        version.version
    )

    # Training must not activate a model automatically.
    assert (
        registry.active_version_id()
        is None
    )

    manager = RuntimeManager(
        registry=registry,
        requested_device="cpu",
    )

    active = manager.activate(
        version.version
    )

    assert (
        active.version
        == version.version
    )

    assert (
        registry.active_version_id()
        == version.version
    )

    runtime = (
        manager.get_runtime()
    )

    assert runtime is not None

    history = [
        5.0
        + float(
            index % 7
        )
        for index in range(
            26,
            40,
        )
    ]

    prediction = runtime.predict(
        product_sku="SKU-A",
        history=history,
    )

    assert (
        prediction.product_sku
        == "SKU-A"
    )

    assert (
        prediction.window_size
        == 14
    )

    assert (
        prediction.history_points_used
        == 14
    )

    assert math.isfinite(
        prediction.prediction
    )

    assert (
        prediction.prediction
        >= 0.0
    )