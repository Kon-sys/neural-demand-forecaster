from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import pandas as pd

from demand_forecast_ml.data.inspect import (
    load_processed_csv,
)
from demand_forecast_ml.evaluation.config import (
    TRAIN_END,
    VALIDATION_END,
)
from demand_forecast_ml.evaluation.metrics import (
    RegressionMetrics,
    calculate_regression_metrics,
)
from demand_forecast_ml.lstm.checkpoint import (
    load_checkpoint,
)
from demand_forecast_ml.lstm.config import (
    DEFAULT_LSTM_CONFIG,
    LSTMConfig,
)
from demand_forecast_ml.lstm.dataset import (
    build_lstm_datasets,
)
from demand_forecast_ml.lstm.inference import (
    predict_dataset,
)
from demand_forecast_ml.lstm.model import (
    count_trainable_parameters,
)
from demand_forecast_ml.lstm.scaling import (
    prepare_lstm_partitions,
)
from demand_forecast_ml.lstm.training import (
    EpochRecord,
    TrainingResult,
    resolve_device,
    train_lstm,
)


def _save_training_history(
    *,
    history: tuple[
        EpochRecord,
        ...,
    ],
    output_path: Path,
) -> pd.DataFrame:
    dataframe = pd.DataFrame(
        [
            asdict(
                record
            )
            for record in history
        ]
    )

    dataframe.to_csv(
        output_path,
        index=False,
    )

    return dataframe


def _save_training_plot(
    *,
    history: pd.DataFrame,
    output_path: Path,
) -> None:
    figure, axis = plt.subplots(
        figsize=(10, 5)
    )

    axis.plot(
        history["epoch"],
        history["train_loss"],
        label="Train loss",
    )

    axis.plot(
        history["epoch"],
        history["validation_loss"],
        label="Validation loss",
    )

    axis.set_title(
        "LSTM training history"
    )

    axis.set_xlabel(
        "Epoch"
    )

    axis.set_ylabel(
        "MSE loss"
    )

    axis.legend()

    axis.grid(
        alpha=0.25
    )

    figure.tight_layout()

    figure.savefig(
        output_path,
        dpi=150,
    )

    plt.close(
        figure
    )


def _save_validation_plot(
    *,
    predictions: pd.DataFrame,
    output_path: Path,
) -> None:
    daily = (
        predictions
        .groupby(
            "date",
            as_index=False,
        )
        .agg(
            actual=(
                "actual",
                "mean",
            ),
            prediction=(
                "prediction",
                "mean",
            ),
        )
    )

    figure, axis = plt.subplots(
        figsize=(12, 5)
    )

    axis.plot(
        daily["date"],
        daily["actual"],
        marker="o",
        label="Actual mean demand",
    )

    axis.plot(
        daily["date"],
        daily["prediction"],
        marker="o",
        label="Predicted mean demand",
    )

    axis.set_title(
        "LSTM validation — mean demand across series"
    )

    axis.set_xlabel(
        "Date"
    )

    axis.set_ylabel(
        "Demand"
    )

    axis.legend()

    axis.grid(
        alpha=0.25
    )

    figure.autofmt_xdate()

    figure.tight_layout()

    figure.savefig(
        output_path,
        dpi=150,
    )

    plt.close(
        figure
    )


def _calculate_metrics(
    predictions: pd.DataFrame,
) -> RegressionMetrics:
    return (
        calculate_regression_metrics(
            predictions[
                "actual"
            ],
            predictions[
                "prediction"
            ],
        )
    )


def _save_metrics(
    *,
    metrics: RegressionMetrics,
    output_path: Path,
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

    output_path.write_text(
        json.dumps(
            payload,
            indent=2,
        ),
        encoding="utf-8",
    )


def _save_summary(
    *,
    config: LSTMConfig,
    training_result: TrainingResult,
    metrics: RegressionMetrics,
    train_samples: int,
    validation_samples: int,
    trainable_parameters: int,
    device_name: str,
    output_path: Path,
) -> None:
    mape = (
        "N/A"
        if metrics.mape is None
        else f"{metrics.mape:.4f}%"
    )

    lines = [
        "KP-23 LSTM",
        "",
        f"Device: {device_name}",
        "",
        f"Train end: {TRAIN_END}",
        (
            "Validation end: "
            f"{VALIDATION_END}"
        ),
        (
            "TEST partition: reserved "
            "for KP-24 final comparison"
        ),
        "",
        "Model:",
        (
            f"window_size={config.window_size}"
        ),
        (
            f"input_size={config.input_size}"
        ),
        (
            f"hidden_size={config.hidden_size}"
        ),
        (
            f"num_layers={config.num_layers}"
        ),
        (
            f"dropout={config.dropout}"
        ),
        (
            "trainable_parameters="
            f"{trainable_parameters}"
        ),
        "",
        "Training:",
        (
            f"train_samples={train_samples}"
        ),
        (
            "validation_samples="
            f"{validation_samples}"
        ),
        (
            f"batch_size={config.batch_size}"
        ),
        (
            "learning_rate="
            f"{config.learning_rate}"
        ),
        (
            f"max_epochs={config.max_epochs}"
        ),
        (
            "early_stopping_patience="
            f"{config.early_stopping_patience}"
        ),
        (
            "epochs_completed="
            f"{training_result.epochs_completed}"
        ),
        (
            f"best_epoch={training_result.best_epoch}"
        ),
        (
            "best_scaled_validation_loss="
            f"{training_result.best_validation_loss:.6f}"
        ),
        (
            "stopped_early="
            f"{training_result.stopped_early}"
        ),
        "",
        "Validation metrics in original demand scale:",
        (
            f"MAE={metrics.mae:.4f}"
        ),
        (
            f"RMSE={metrics.rmse:.4f}"
        ),
        (
            f"MAPE={mape}"
        ),
        (
            "Observations="
            f"{metrics.observations}"
        ),
        (
            "MAPE observations="
            f"{metrics.mape_observations}"
        ),
    ]

    output_path.write_text(
        "\n".join(
            lines
        ),
        encoding="utf-8",
    )


def run_lstm_experiment(
    *,
    dataset_path: Path,
    output_dir: Path,
    config: LSTMConfig = (
        DEFAULT_LSTM_CONFIG
    ),
) -> None:
    config.validate()

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    plots_dir = (
        output_dir
        / "plots"
    )

    plots_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    dataframe = (
        load_processed_csv(
            dataset_path
        )
    )

    partitions = (
        prepare_lstm_partitions(
            dataframe,
            train_end=TRAIN_END,
            validation_end=(
                VALIDATION_END
            ),
        )
    )

    datasets = (
        build_lstm_datasets(
            partitions,
            window_size=(
                config.window_size
            ),
        )
    )

    device = (
        resolve_device()
    )

    checkpoint_path = (
        output_dir
        / "best_model.pt"
    )

    training_result = train_lstm(
        datasets=datasets,
        config=config,
        checkpoint_path=(
            checkpoint_path
        ),
        device=device,
        verbose=True,
    )

    partitions.scalers.save(
        output_dir
        / "scalers.json"
    )

    history = (
        _save_training_history(
            history=(
                training_result.history
            ),
            output_path=(
                output_dir
                / "training_history.csv"
            ),
        )
    )

    loaded = load_checkpoint(
        checkpoint_path,
        device=device,
    )

    predictions = predict_dataset(
        model=loaded.model,
        dataset=(
            datasets.validation
        ),
        scalers=(
            partitions.scalers
        ),
        device=device,
        batch_size=512,
    )

    predictions.to_csv(
        output_dir
        / "validation_predictions.csv",
        index=False,
        date_format="%Y-%m-%d",
    )

    metrics = (
        _calculate_metrics(
            predictions
        )
    )

    _save_metrics(
        metrics=metrics,
        output_path=(
            output_dir
            / "validation_metrics.json"
        ),
    )

    _save_training_plot(
        history=history,
        output_path=(
            plots_dir
            / "training_history.png"
        ),
    )

    _save_validation_plot(
        predictions=predictions,
        output_path=(
            plots_dir
            / "validation_mean_forecast.png"
        ),
    )

    trainable_parameters = (
        count_trainable_parameters(
            loaded.model
        )
    )

    _save_summary(
        config=loaded.config,
        training_result=(
            training_result
        ),
        metrics=metrics,
        train_samples=len(
            datasets.train
        ),
        validation_samples=len(
            datasets.validation
        ),
        trainable_parameters=(
            trainable_parameters
        ),
        device_name=str(
            device
        ),
        output_path=(
            output_dir
            / "summary.txt"
        ),
    )

    print()
    print(
        "LSTM experiment completed"
    )

    print(
        f"Device: {device}"
    )

    print(
        "Best epoch: "
        f"{training_result.best_epoch}"
    )

    print(
        "Validation MAE: "
        f"{metrics.mae:.4f}"
    )

    print(
        "Validation RMSE: "
        f"{metrics.rmse:.4f}"
    )

    if metrics.mape is None:
        print(
            "Validation MAPE: N/A"
        )
    else:
        print(
            "Validation MAPE: "
            f"{metrics.mape:.4f}%"
        )

    print(
        f"Artifacts: {output_dir}"
    )


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Train and evaluate the KP-23 LSTM model."
        )
    )

    parser.add_argument(
        "dataset",
        type=Path,
    )

    parser.add_argument(
        "output",
        type=Path,
    )

    return parser


def main() -> None:
    parser = (
        _build_parser()
    )

    args = (
        parser.parse_args()
    )

    run_lstm_experiment(
        dataset_path=args.dataset,
        output_dir=args.output,
    )


if __name__ == "__main__":
    main()