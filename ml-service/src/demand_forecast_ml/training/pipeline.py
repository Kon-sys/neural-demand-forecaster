from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import torch

from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from demand_forecast_ml.data.prepare import (
    load_raw_csv,
    prepare_daily_dataset,
)
from demand_forecast_ml.evaluation.metrics import (
    RegressionMetrics,
    calculate_regression_metrics,
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
    LSTMScaledPartitions,
    SeriesScalerRegistry,
)
from demand_forecast_ml.lstm.training import (
    resolve_device,
    train_lstm,
)
from demand_forecast_ml.training.registry import (
    ModelVersion,
)


DEFAULT_VALIDATION_DAYS = 14


class ProductionTrainingError(
    RuntimeError
):
    """Raised when production training cannot be completed."""


@dataclass(frozen=True, slots=True)
class ProductionTrainingResult:
    version: str
    rows: int
    series_count: int

    train_end: str
    validation_start: str
    validation_end: str

    train_samples: int
    validation_samples: int

    best_epoch: int
    epochs_completed: int

    mae: float
    rmse: float
    mape: float | None
    mape_observations: int


def _select_eligible_series(
    dataframe: pd.DataFrame,
    *,
    train_end: pd.Timestamp,
    validation_start: pd.Timestamp,
    validation_end: pd.Timestamp,
    window_size: int,
) -> pd.DataFrame:
    """
    Keep only series that contain enough TRAIN history and cover the
    complete current validation period.
    """

    eligible: list[
        str
    ] = []

    expected_validation_days = (
        validation_end
        - validation_start
    ).days + 1

    for (
        product_sku,
        group,
    ) in dataframe.groupby(
        PRODUCT_COLUMN,
        sort=True,
    ):
        group_dates = (
            pd.to_datetime(
                group[
                    DATE_COLUMN
                ],
                errors="raise",
            )
            .dt.normalize()
        )

        train_count = int(
            group_dates.le(
                train_end
            ).sum()
        )

        validation_count = int(
            (
                group_dates.ge(
                    validation_start
                )
                & group_dates.le(
                    validation_end
                )
            ).sum()
        )

        reaches_latest_date = (
            group_dates.max()
            == validation_end
        )

        if (
            train_count
            >= window_size + 1
            and validation_count
            == expected_validation_days
            and reaches_latest_date
        ):
            eligible.append(
                str(
                    product_sku
                )
            )

    if not eligible:
        raise ProductionTrainingError(
            "Dataset does not contain any series with enough "
            "history for training and validation."
        )

    filtered = dataframe.loc[
        dataframe[
            PRODUCT_COLUMN
        ]
        .astype(str)
        .isin(
            eligible
        )
    ].copy()

    return (
        filtered
        .sort_values(
            by=[
                PRODUCT_COLUMN,
                DATE_COLUMN,
            ],
            kind="stable",
        )
        .reset_index(
            drop=True
        )
    )


def _prepare_partitions(
    dataframe: pd.DataFrame,
    *,
    config: LSTMConfig,
    validation_days: int,
) -> tuple[
    LSTMScaledPartitions,
    pd.DataFrame,
    pd.Timestamp,
    pd.Timestamp,
]:
    if validation_days <= 0:
        raise ValueError(
            "validation_days must be greater than zero."
        )

    dates = pd.to_datetime(
        dataframe[
            DATE_COLUMN
        ],
        errors="raise",
    ).dt.normalize()

    validation_end = (
        dates.max()
    )

    validation_start = (
        validation_end
        - pd.Timedelta(
            days=validation_days - 1
        )
    )

    train_end = (
        validation_start
        - pd.Timedelta(
            days=1
        )
    )

    eligible = (
        _select_eligible_series(
            dataframe,
            train_end=train_end,
            validation_start=(
                validation_start
            ),
            validation_end=(
                validation_end
            ),
            window_size=(
                config.window_size
            ),
        )
    )

    eligible_dates = pd.to_datetime(
        eligible[
            DATE_COLUMN
        ],
        errors="raise",
    ).dt.normalize()

    train = eligible.loc[
        eligible_dates.le(
            train_end
        )
    ].copy()

    validation = eligible.loc[
        eligible_dates.ge(
            validation_start
        )
        & eligible_dates.le(
            validation_end
        )
    ].copy()

    if train.empty:
        raise ProductionTrainingError(
            "TRAIN partition is empty."
        )

    if validation.empty:
        raise ProductionTrainingError(
            "VALIDATION partition is empty."
        )

    scalers = (
        SeriesScalerRegistry.fit(
            train
        )
    )

    scaled_train = (
        scalers.transform(
            train
        )
    )

    scaled_validation = (
        scalers.transform(
            validation
        )
    )

    empty_test = (
        scaled_validation
        .iloc[
            0:0
        ]
        .copy()
    )

    partitions = (
        LSTMScaledPartitions(
            train=scaled_train,
            validation=(
                scaled_validation
            ),
            test=empty_test,
            scalers=scalers,
            train_end=train_end,
            validation_end=(
                validation_end
            ),
        )
    )

    return (
        partitions,
        eligible,
        validation_start,
        validation_end,
    )


def _save_metrics(
    *,
    metrics: RegressionMetrics,
    path: Path,
) -> None:
    payload = {
        "mae": metrics.mae,
        "rmse": metrics.rmse,
        "mape": metrics.mape,
        "observations": (
            metrics.observations
        ),
        "mape_observations": (
            metrics.mape_observations
        ),
    }

    path.write_text(
        json.dumps(
            payload,
            indent=2,
        ),
        encoding="utf-8",
    )


def train_production_model(
    *,
    dataset_path: str | Path,
    model_version: ModelVersion,
    config: LSTMConfig | None = None,
    validation_days: int = DEFAULT_VALIDATION_DAYS,
    device: torch.device | None = None,
) -> ProductionTrainingResult:
    """
    Train a new production LSTM version from application sales data.

    Expected uploaded CSV contract:

        product_sku,date,quantity

    A new model version is produced but NOT activated automatically.
    """

    resolved_config = (
        config
        if config is not None
        else LSTMConfig(
            window_size=14,
            input_size=1,
            hidden_size=64,
            num_layers=2,
            dropout=0.2,
            batch_size=128,
            learning_rate=0.001,
            max_epochs=100,
            early_stopping_patience=10,
            early_stopping_min_delta=0.0001,
            random_seed=42,
        )
    )

    resolved_config.validate()

    raw = load_raw_csv(
        dataset_path
    )

    processed = (
        prepare_daily_dataset(
            raw
        )
    )

    (
        partitions,
        eligible,
        validation_start,
        validation_end,
    ) = _prepare_partitions(
        processed,
        config=resolved_config,
        validation_days=(
            validation_days
        ),
    )

    datasets = build_lstm_datasets(
        partitions,
        window_size=(
            resolved_config
            .window_size
        ),
    )

    training_device = (
        device
        if device is not None
        else resolve_device()
    )

    training_result = (
        train_lstm(
            datasets=datasets,
            config=resolved_config,
            checkpoint_path=(
                model_version
                .checkpoint_path
            ),
            device=(
                training_device
            ),
            verbose=False,
        )
    )

    partitions.scalers.save(
        model_version
        .scalers_path
    )

    loaded = load_checkpoint(
        model_version
        .checkpoint_path,
        device=training_device,
    )

    predictions = predict_dataset(
        model=loaded.model,
        dataset=(
            datasets.validation
        ),
        scalers=(
            partitions.scalers
        ),
        device=training_device,
        batch_size=512,
    )

    metrics = (
        calculate_regression_metrics(
            predictions[
                "actual"
            ],
            predictions[
                "prediction"
            ],
        )
    )

    _save_metrics(
        metrics=metrics,
        path=(
            model_version
            .metrics_path
        ),
    )

    pd.DataFrame(
        [
            asdict(
                record
            )
            for record in (
                training_result
                .history
            )
        ]
    ).to_csv(
        model_version.directory
        / "training_history.csv",
        index=False,
    )

    predictions.to_csv(
        model_version.directory
        / "validation_predictions.csv",
        index=False,
        date_format="%Y-%m-%d",
    )

    train_end = (
        partitions.train_end
    )

    metadata = {
        "version": (
            model_version.version
        ),
        "created_at": (
            datetime.now(
                timezone.utc
            ).isoformat()
        ),
        "source": (
            "application_uploaded_data"
        ),
        "status": "ready",
        "dataset": {
            "rows": int(
                len(
                    eligible
                )
            ),
            "series_count": int(
                eligible[
                    PRODUCT_COLUMN
                ].nunique()
            ),
            "min_date": str(
                pd.to_datetime(
                    eligible[
                        DATE_COLUMN
                    ]
                )
                .min()
                .date()
            ),
            "max_date": str(
                pd.to_datetime(
                    eligible[
                        DATE_COLUMN
                    ]
                )
                .max()
                .date()
            ),
        },
        "split": {
            "train_end": str(
                train_end.date()
            ),
            "validation_start": str(
                validation_start.date()
            ),
            "validation_end": str(
                validation_end.date()
            ),
        },
        "config": asdict(
            resolved_config
        ),
        "training": {
            "train_samples": len(
                datasets.train
            ),
            "validation_samples": len(
                datasets.validation
            ),
            "best_epoch": (
                training_result
                .best_epoch
            ),
            "epochs_completed": (
                training_result
                .epochs_completed
            ),
            "stopped_early": (
                training_result
                .stopped_early
            ),
        },
        "validation_metrics": {
            "mae": metrics.mae,
            "rmse": metrics.rmse,
            "mape": metrics.mape,
            "observations": (
                metrics.observations
            ),
            "mape_observations": (
                metrics
                .mape_observations
            ),
        },
    }

    model_version.metadata_path.write_text(
        json.dumps(
            metadata,
            indent=2,
        ),
        encoding="utf-8",
    )

    return ProductionTrainingResult(
        version=(
            model_version.version
        ),
        rows=len(
            eligible
        ),
        series_count=int(
            eligible[
                PRODUCT_COLUMN
            ].nunique()
        ),
        train_end=str(
            train_end.date()
        ),
        validation_start=str(
            validation_start.date()
        ),
        validation_end=str(
            validation_end.date()
        ),
        train_samples=len(
            datasets.train
        ),
        validation_samples=len(
            datasets.validation
        ),
        best_epoch=(
            training_result
            .best_epoch
        ),
        epochs_completed=(
            training_result
            .epochs_completed
        ),
        mae=metrics.mae,
        rmse=metrics.rmse,
        mape=metrics.mape,
        mape_observations=(
            metrics
            .mape_observations
        ),
    )