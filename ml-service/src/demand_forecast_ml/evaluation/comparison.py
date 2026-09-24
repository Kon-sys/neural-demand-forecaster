from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import pandas as pd
import torch

from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from demand_forecast_ml.data.inspect import (
    load_processed_csv,
)
from demand_forecast_ml.data.preprocessing import (
    SCALED_TARGET_COLUMN,
    build_windows,
)
from demand_forecast_ml.data.split import (
    split_by_date,
)
from demand_forecast_ml.evaluation.config import (
    TEST_START,
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
from demand_forecast_ml.lstm.dataset import (
    LSTMWindowDataset,
)
from demand_forecast_ml.lstm.inference import (
    predict_dataset,
)
from demand_forecast_ml.lstm.scaling import (
    SeriesScalerRegistry,
)
from demand_forecast_ml.lstm.training import (
    resolve_device,
)


def load_selected_baseline_window(
    artifact_path: str | Path,
) -> int:
    payload = json.loads(
        Path(
            artifact_path
        ).read_text(
            encoding="utf-8",
        )
    )

    if payload.get("model") != "moving_average":
        raise ValueError(
            "Selected baseline artifact must contain Moving Average."
        )

    window = int(
        payload[
            "window"
        ]
    )

    if window <= 0:
        raise ValueError(
            "Selected Moving Average window must be greater than zero."
        )

    return window


def build_moving_average_test_predictions(
    dataframe: pd.DataFrame,
    *,
    window: int,
) -> pd.DataFrame:
    """
    Build rolling one-step-ahead Moving Average predictions for TEST.

    Prediction for date t uses only observed values preceding t.

    During TEST backtesting, an actual value from an earlier TEST date
    may therefore be used when predicting a later TEST date.

    This matches the one-step-ahead validation protocol used in KP-22.
    """

    if window <= 0:
        raise ValueError(
            "Moving Average window must be greater than zero."
        )

    splits = split_by_date(
        dataframe,
        train_end=TRAIN_END,
        validation_end=VALIDATION_END,
    )

    expected_test_start = (
        splits.validation_end
        + pd.Timedelta(
            days=1
        )
    )

    configured_test_start = (
        pd.Timestamp(
            TEST_START
        ).normalize()
    )

    if (
        expected_test_start
        != configured_test_start
    ):
        raise ValueError(
            "Configured TEST_START does not follow VALIDATION_END."
        )

    history = pd.concat(
        [
            splits.train,
            splits.validation,
            splits.test,
        ],
        ignore_index=True,
    )

    history = (
        history
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

    frames: list[
        pd.DataFrame
    ] = []

    for (
        product_sku,
        group,
    ) in history.groupby(
        PRODUCT_COLUMN,
        sort=True,
    ):
        group = (
            group
            .sort_values(
                DATE_COLUMN,
                kind="stable",
            )
            .reset_index(
                drop=True
            )
        )

        test_mask = (
            group[
                DATE_COLUMN
            ]
            > splits.validation_end
        )

        moving_average = (
            group[
                TARGET_COLUMN
            ]
            .shift(
                1
            )
            .rolling(
                window=window,
                min_periods=window,
            )
            .mean()
        )

        result = group.loc[
            test_mask,
            [
                DATE_COLUMN,
                TARGET_COLUMN,
            ],
        ].copy()

        result[
            PRODUCT_COLUMN
        ] = str(
            product_sku
        )

        result[
            "prediction"
        ] = (
            moving_average.loc[
                test_mask
            ]
            .to_numpy()
        )

        result = result.rename(
            columns={
                TARGET_COLUMN: (
                    "actual"
                ),
            }
        )

        frames.append(
            result[
                [
                    PRODUCT_COLUMN,
                    DATE_COLUMN,
                    "actual",
                    "prediction",
                ]
            ]
        )

    predictions = pd.concat(
        frames,
        ignore_index=True,
    )

    if predictions[
        "prediction"
    ].isna().any():
        raise ValueError(
            "Insufficient history for selected Moving Average window."
        )

    if len(
        predictions
    ) != len(
        splits.test
    ):
        raise RuntimeError(
            "Moving Average TEST prediction count "
            "does not match TEST partition size."
        )

    return (
        predictions
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


def build_lstm_test_dataset(
    dataframe: pd.DataFrame,
    *,
    scalers: SeriesScalerRegistry,
    window_size: int,
) -> LSTMWindowDataset:
    """
    Build the previously untouched TEST samples for fixed LSTM.

    Inputs use saved TRAIN-only scalers.

    Original quantity values are preserved separately as exact
    ground truth for final metrics.
    """

    if window_size <= 0:
        raise ValueError(
            "LSTM window_size must be greater than zero."
        )

    splits = split_by_date(
        dataframe,
        train_end=TRAIN_END,
        validation_end=VALIDATION_END,
    )

    scaled_history = (
        scalers.transform(
            dataframe
        )
    )

    scaled_samples = build_windows(
        scaled_history,
        window_size=window_size,
        value_column=(
            SCALED_TARGET_COLUMN
        ),
        target_start=(
            TEST_START
        ),
    )

    original_samples = build_windows(
        dataframe,
        window_size=window_size,
        value_column=(
            TARGET_COLUMN
        ),
        target_start=(
            TEST_START
        ),
    )

    if len(
        scaled_samples
    ) != len(
        original_samples
    ):
        raise RuntimeError(
            "Scaled and original TEST samples have different sizes."
        )

    if len(
        scaled_samples
    ) != len(
        splits.test
    ):
        raise RuntimeError(
            "LSTM TEST sample count does not match TEST partition size."
        )

    actual_targets: list[
        float
    ] = []

    for (
        scaled_sample,
        original_sample,
    ) in zip(
        scaled_samples,
        original_samples,
        strict=True,
    ):
        if (
            scaled_sample.product_sku
            != original_sample.product_sku
        ):
            raise RuntimeError(
                "Scaled and original TEST samples contain "
                "different product identifiers."
            )

        if (
            scaled_sample.target_date
            != original_sample.target_date
        ):
            raise RuntimeError(
                "Scaled and original TEST samples contain "
                "different target dates."
            )

        actual_targets.append(
            float(
                original_sample.target
            )
        )

    return LSTMWindowDataset(
        samples=scaled_samples,
        actual_targets=tuple(
            actual_targets
        ),
    )


def align_test_predictions(
    moving_average: pd.DataFrame,
    lstm: pd.DataFrame,
) -> pd.DataFrame:
    """
    Align both fixed models on exactly the same TEST observations.
    """

    baseline = moving_average.rename(
        columns={
            "actual": (
                "actual_moving_average"
            ),
            "prediction": (
                "moving_average_prediction"
            ),
        }
    )

    neural = lstm.loc[
        :,
        [
            PRODUCT_COLUMN,
            DATE_COLUMN,
            "actual",
            "prediction",
        ],
    ].rename(
        columns={
            "actual": (
                "actual_lstm"
            ),
            "prediction": (
                "lstm_prediction"
            ),
        }
    )

    aligned = baseline.merge(
        neural,
        on=[
            PRODUCT_COLUMN,
            DATE_COLUMN,
        ],
        how="inner",
        validate="one_to_one",
    )

    if len(
        aligned
    ) != len(
        moving_average
    ):
        raise ValueError(
            "Models do not contain identical TEST observations."
        )

    if len(
        aligned
    ) != len(
        lstm
    ):
        raise ValueError(
            "Models do not contain identical TEST observations."
        )

    actual_difference = (
        aligned[
            "actual_moving_average"
        ]
        - aligned[
            "actual_lstm"
        ]
    ).abs()

    if actual_difference.gt(
        1e-12
    ).any():
        raise ValueError(
            "Ground truth differs between model predictions."
        )

    result = pd.DataFrame(
        {
            PRODUCT_COLUMN: (
                aligned[
                    PRODUCT_COLUMN
                ]
            ),
            DATE_COLUMN: (
                aligned[
                    DATE_COLUMN
                ]
            ),
            "actual": (
                aligned[
                    "actual_moving_average"
                ]
                .astype(
                    "float64"
                )
            ),
            "moving_average_prediction": (
                aligned[
                    "moving_average_prediction"
                ]
                .astype(
                    "float64"
                )
            ),
            "lstm_prediction": (
                aligned[
                    "lstm_prediction"
                ]
                .astype(
                    "float64"
                )
            ),
        }
    )

    result[
        "moving_average_absolute_error"
    ] = (
        result[
            "actual"
        ]
        - result[
            "moving_average_prediction"
        ]
    ).abs()

    result[
        "lstm_absolute_error"
    ] = (
        result[
            "actual"
        ]
        - result[
            "lstm_prediction"
        ]
    ).abs()

    return (
        result
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


def _metrics_record(
    *,
    model: str,
    metrics: RegressionMetrics,
) -> dict[
    str,
    object,
]:
    return {
        "model": model,
        "observations": (
            metrics.observations
        ),
        "mae": (
            metrics.mae
        ),
        "rmse": (
            metrics.rmse
        ),
        "mape": (
            metrics.mape
        ),
        "mape_observations": (
            metrics.mape_observations
        ),
    }


def calculate_comparison_metrics(
    predictions: pd.DataFrame,
) -> pd.DataFrame:
    moving_average = (
        calculate_regression_metrics(
            predictions[
                "actual"
            ],
            predictions[
                "moving_average_prediction"
            ],
        )
    )

    lstm = (
        calculate_regression_metrics(
            predictions[
                "actual"
            ],
            predictions[
                "lstm_prediction"
            ],
        )
    )

    return pd.DataFrame(
        [
            _metrics_record(
                model="moving_average",
                metrics=(
                    moving_average
                ),
            ),
            _metrics_record(
                model="lstm",
                metrics=lstm,
            ),
        ]
    )


def calculate_per_series_metrics(
    predictions: pd.DataFrame,
) -> pd.DataFrame:
    records: list[
        dict[str, object]
    ] = []

    for (
        product_sku,
        group,
    ) in predictions.groupby(
        PRODUCT_COLUMN,
        sort=True,
    ):
        moving_average = (
            calculate_regression_metrics(
                group[
                    "actual"
                ],
                group[
                    "moving_average_prediction"
                ],
            )
        )

        lstm = (
            calculate_regression_metrics(
                group[
                    "actual"
                ],
                group[
                    "lstm_prediction"
                ],
            )
        )

        records.append(
            {
                PRODUCT_COLUMN: (
                    str(
                        product_sku
                    )
                ),
                "moving_average_mae": (
                    moving_average.mae
                ),
                "moving_average_rmse": (
                    moving_average.rmse
                ),
                "lstm_mae": (
                    lstm.mae
                ),
                "lstm_rmse": (
                    lstm.rmse
                ),
                "mae_difference_lstm_minus_ma": (
                    lstm.mae
                    - moving_average.mae
                ),
            }
        )

    return pd.DataFrame(
        records
    )


def calculate_daily_metrics(
    predictions: pd.DataFrame,
) -> pd.DataFrame:
    records: list[
        dict[str, object]
    ] = []

    for (
        date,
        group,
    ) in predictions.groupby(
        DATE_COLUMN,
        sort=True,
    ):
        moving_average = (
            calculate_regression_metrics(
                group[
                    "actual"
                ],
                group[
                    "moving_average_prediction"
                ],
            )
        )

        lstm = (
            calculate_regression_metrics(
                group[
                    "actual"
                ],
                group[
                    "lstm_prediction"
                ],
            )
        )

        records.append(
            {
                DATE_COLUMN: (
                    date
                ),
                "moving_average_mae": (
                    moving_average.mae
                ),
                "moving_average_rmse": (
                    moving_average.rmse
                ),
                "lstm_mae": (
                    lstm.mae
                ),
                "lstm_rmse": (
                    lstm.rmse
                ),
            }
        )

    return pd.DataFrame(
        records
    )


def save_mean_forecast_plot(
    predictions: pd.DataFrame,
    *,
    output_path: Path,
) -> None:
    daily = (
        predictions
        .groupby(
            DATE_COLUMN,
            as_index=False,
        )
        .agg(
            actual=(
                "actual",
                "mean",
            ),
            moving_average=(
                "moving_average_prediction",
                "mean",
            ),
            lstm=(
                "lstm_prediction",
                "mean",
            ),
        )
    )

    figure, axis = plt.subplots(
        figsize=(
            12,
            5,
        )
    )

    axis.plot(
        daily[
            DATE_COLUMN
        ],
        daily[
            "actual"
        ],
        marker="o",
        label="Actual",
    )

    axis.plot(
        daily[
            DATE_COLUMN
        ],
        daily[
            "moving_average"
        ],
        marker="o",
        label="Moving Average",
    )

    axis.plot(
        daily[
            DATE_COLUMN
        ],
        daily[
            "lstm"
        ],
        marker="o",
        label="LSTM",
    )

    axis.set_title(
        "TEST mean demand forecast"
    )

    axis.set_xlabel(
        "Date"
    )

    axis.set_ylabel(
        "Mean demand"
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


def save_daily_mae_plot(
    daily_metrics: pd.DataFrame,
    *,
    output_path: Path,
) -> None:
    figure, axis = plt.subplots(
        figsize=(
            12,
            5,
        )
    )

    axis.plot(
        daily_metrics[
            DATE_COLUMN
        ],
        daily_metrics[
            "moving_average_mae"
        ],
        marker="o",
        label="Moving Average MAE",
    )

    axis.plot(
        daily_metrics[
            DATE_COLUMN
        ],
        daily_metrics[
            "lstm_mae"
        ],
        marker="o",
        label="LSTM MAE",
    )

    axis.set_title(
        "TEST daily MAE"
    )

    axis.set_xlabel(
        "Date"
    )

    axis.set_ylabel(
        "MAE"
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


def save_summary(
    *,
    baseline_window: int,
    lstm_window: int,
    metrics: pd.DataFrame,
    per_series: pd.DataFrame,
    output_path: Path,
) -> None:
    moving_average = metrics.loc[
        metrics[
            "model"
        ].eq(
            "moving_average"
        )
    ].iloc[0]

    lstm = metrics.loc[
        metrics[
            "model"
        ].eq(
            "lstm"
        )
    ].iloc[0]

    ma_lower_series = int(
        per_series[
            "mae_difference_lstm_minus_ma"
        ].gt(
            0
        ).sum()
    )

    lstm_lower_series = int(
        per_series[
            "mae_difference_lstm_minus_ma"
        ].lt(
            0
        ).sum()
    )

    equal_series = int(
        per_series[
            "mae_difference_lstm_minus_ma"
        ].eq(
            0
        ).sum()
    )

    moving_average_mape = (
        "N/A"
        if pd.isna(
            moving_average[
                "mape"
            ]
        )
        else (
            f"{float(moving_average['mape']):.4f}%"
        )
    )

    lstm_mape = (
        "N/A"
        if pd.isna(
            lstm[
                "mape"
            ]
        )
        else (
            f"{float(lstm['mape']):.4f}%"
        )
    )

    lines = [
        "KP-24 Model Comparison",
        "",
        "Evaluation protocol:",
        "rolling one-step-ahead backtesting",
        "",
        f"Train end: {TRAIN_END}",
        (
            "Validation end: "
            f"{VALIDATION_END}"
        ),
        (
            "Test start: "
            f"{TEST_START}"
        ),
        "",
        "Frozen configurations:",
        (
            "Moving Average window="
            f"{baseline_window}"
        ),
        (
            "LSTM window="
            f"{lstm_window}"
        ),
        "",
        (
            "TEST observations="
            f"{int(moving_average['observations'])}"
        ),
        (
            "MAPE observations="
            f"{int(moving_average['mape_observations'])}"
        ),
        "",
        "Moving Average TEST:",
        (
            "MAE="
            f"{float(moving_average['mae']):.4f}"
        ),
        (
            "RMSE="
            f"{float(moving_average['rmse']):.4f}"
        ),
        (
            "MAPE="
            f"{moving_average_mape}"
        ),
        "",
        "LSTM TEST:",
        (
            "MAE="
            f"{float(lstm['mae']):.4f}"
        ),
        (
            "RMSE="
            f"{float(lstm['rmse']):.4f}"
        ),
        (
            "MAPE="
            f"{lstm_mape}"
        ),
        "",
        "Per-series MAE:",
        (
            "Moving Average lower error="
            f"{ma_lower_series}"
        ),
        (
            "LSTM lower error="
            f"{lstm_lower_series}"
        ),
        (
            "Equal="
            f"{equal_series}"
        ),
        "",
        (
            "No model parameters were changed "
            "after opening TEST."
        ),
    ]

    output_path.write_text(
        "\n".join(
            lines
        ),
        encoding="utf-8",
    )


def run_model_comparison(
    *,
    dataset_path: Path,
    baseline_artifacts_dir: Path,
    lstm_artifacts_dir: Path,
    output_dir: Path,
) -> None:
    dataframe = load_processed_csv(
        dataset_path
    )

    baseline_window = (
        load_selected_baseline_window(
            baseline_artifacts_dir
            / "selected_baseline.json"
        )
    )

    device = (
        resolve_device()
    )

    loaded_lstm = load_checkpoint(
        lstm_artifacts_dir
        / "best_model.pt",
        device=device,
    )

    scalers = (
        SeriesScalerRegistry.load(
            lstm_artifacts_dir
            / "scalers.json"
        )
    )

    moving_average_predictions = (
        build_moving_average_test_predictions(
            dataframe,
            window=(
                baseline_window
            ),
        )
    )

    lstm_test_dataset = (
        build_lstm_test_dataset(
            dataframe,
            scalers=scalers,
            window_size=(
                loaded_lstm
                .config
                .window_size
            ),
        )
    )

    lstm_predictions = (
        predict_dataset(
            model=(
                loaded_lstm.model
            ),
            dataset=(
                lstm_test_dataset
            ),
            scalers=scalers,
            device=device,
            batch_size=512,
        )
    )

    predictions = (
        align_test_predictions(
            moving_average_predictions,
            lstm_predictions,
        )
    )

    metrics = (
        calculate_comparison_metrics(
            predictions
        )
    )

    per_series = (
        calculate_per_series_metrics(
            predictions
        )
    )

    daily_metrics = (
        calculate_daily_metrics(
            predictions
        )
    )

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

    predictions.to_csv(
        output_dir
        / "test_predictions.csv",
        index=False,
        date_format="%Y-%m-%d",
    )

    metrics.to_csv(
        output_dir
        / "comparison_metrics.csv",
        index=False,
    )

    per_series.to_csv(
        output_dir
        / "per_series_metrics.csv",
        index=False,
    )

    daily_metrics.to_csv(
        output_dir
        / "daily_metrics.csv",
        index=False,
        date_format="%Y-%m-%d",
    )

    save_mean_forecast_plot(
        predictions,
        output_path=(
            plots_dir
            / "test_mean_forecast.png"
        ),
    )

    save_daily_mae_plot(
        daily_metrics,
        output_path=(
            plots_dir
            / "test_daily_mae.png"
        ),
    )

    save_summary(
        baseline_window=(
            baseline_window
        ),
        lstm_window=(
            loaded_lstm
            .config
            .window_size
        ),
        metrics=metrics,
        per_series=per_series,
        output_path=(
            output_dir
            / "summary.txt"
        ),
    )

    print(
        "KP-24 model comparison completed"
    )

    print(
        f"Device: {device}"
    )

    print(
        f"TEST observations: {len(predictions)}"
    )

    print()

    print(
        metrics.to_string(
            index=False,
            float_format=lambda value: (
                f"{value:.4f}"
            ),
        )
    )

    print()

    print(
        f"Artifacts: {output_dir}"
    )


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Compare frozen Moving Average and LSTM "
            "models on the held-out TEST partition."
        )
    )

    parser.add_argument(
        "dataset",
        type=Path,
    )

    parser.add_argument(
        "baseline_artifacts",
        type=Path,
    )

    parser.add_argument(
        "lstm_artifacts",
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

    run_model_comparison(
        dataset_path=(
            args.dataset
        ),
        baseline_artifacts_dir=(
            args.baseline_artifacts
        ),
        lstm_artifacts_dir=(
            args.lstm_artifacts
        ),
        output_dir=(
            args.output
        ),
    )


if __name__ == "__main__":
    main()