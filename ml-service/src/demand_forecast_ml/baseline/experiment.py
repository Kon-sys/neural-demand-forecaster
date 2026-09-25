from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import pandas as pd

from demand_forecast_ml.baseline.moving_average import (
    build_moving_average_validation_predictions,
)
from demand_forecast_ml.baseline.naive import (
    build_naive_validation_predictions,
)
from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    PRODUCT_COLUMN,
)
from demand_forecast_ml.data.inspect import (
    load_processed_csv,
)
from demand_forecast_ml.evaluation.config import (
    BASELINE_SELECTION_METRIC,
    MOVING_AVERAGE_WINDOWS,
    TRAIN_END,
    VALIDATION_END,
)
from demand_forecast_ml.evaluation.metrics import (
    calculate_regression_metrics,
)


def evaluate_predictions(
    predictions: pd.DataFrame,
) -> pd.DataFrame:
    records: list[dict[str, object]] = []

    for (
        model,
        window,
    ), group in predictions.groupby(
        [
            "model",
            "window",
        ],
        sort=True,
    ):
        metrics = (
            calculate_regression_metrics(
                group["actual"],
                group["prediction"],
            )
        )

        records.append(
            {
                "model": model,
                "window": int(window),
                "observations": (
                    metrics.observations
                ),
                "mae": metrics.mae,
                "rmse": metrics.rmse,
                "mape": metrics.mape,
                "mape_observations": (
                    metrics.mape_observations
                ),
            }
        )

    return (
        pd.DataFrame(records)
        .sort_values(
            by=[
                "model",
                "window",
            ],
            kind="stable",
        )
        .reset_index(drop=True)
    )


def select_moving_average_baseline(
    metrics: pd.DataFrame,
) -> pd.Series:
    moving_average = metrics.loc[
        metrics["model"].eq(
            "moving_average"
        )
    ].copy()

    if moving_average.empty:
        raise ValueError(
            "Moving Average metrics are missing."
        )

    if (
        BASELINE_SELECTION_METRIC
        != "mae"
    ):
        raise ValueError(
            "Unsupported baseline selection metric."
        )

    ranked = (
        moving_average
        .sort_values(
            by=[
                "mae",
                "rmse",
                "mape",
                "window",
            ],
            kind="stable",
        )
        .reset_index(drop=True)
    )

    return ranked.iloc[0]


def _safe_filename(
    value: str,
) -> str:
    return re.sub(
        r"[^A-Za-z0-9_.-]+",
        "_",
        value,
    )


def save_validation_plots(
    predictions: pd.DataFrame,
    *,
    selected_window: int,
    output_dir: Path,
) -> None:
    plot_data = predictions.loc[
        predictions[
            "model"
        ].eq(
            "moving_average"
        )
        & predictions[
            "window"
        ].eq(
            selected_window
        )
    ].copy()

    plots_dir = (
        output_dir
        / "plots"
    )

    plots_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    for product_sku, group in plot_data.groupby(
        PRODUCT_COLUMN,
        sort=True,
    ):
        group = group.sort_values(
            DATE_COLUMN
        )

        figure, axis = plt.subplots(
            figsize=(13, 6)
        )

        axis.plot(
            group[DATE_COLUMN],
            group["actual"],
            label="Actual",
            linewidth=1.4,
        )

        axis.plot(
            group[DATE_COLUMN],
            group["prediction"],
            label="Prediction",
            linewidth=1.4,
        )

        axis.set_title(
            (
                "Moving Average validation forecast — "
                f"{product_sku}"
            )
        )

        axis.set_xlabel(
            "Date"
        )

        axis.set_ylabel(
            "Quantity"
        )

        axis.legend()

        axis.grid(
            alpha=0.25
        )

        figure.tight_layout()

        figure.savefig(
            plots_dir
            / (
                _safe_filename(
                    str(product_sku)
                )
                + ".png"
            ),
            dpi=150,
        )

        plt.close(
            figure
        )


def save_selected_baseline(
    selected: pd.Series,
    output_path: Path,
) -> None:
    payload = {
        "model": "moving_average",
        "window": int(
            selected["window"]
        ),
        "selection_metric": (
            BASELINE_SELECTION_METRIC
        ),
        "validation_metrics": {
            "mae": float(
                selected["mae"]
            ),
            "rmse": float(
                selected["rmse"]
            ),
            "mape": (
                None
                if pd.isna(
                    selected["mape"]
                )
                else float(
                    selected["mape"]
                )
            ),
        },
        "train_end": TRAIN_END,
        "validation_end": (
            VALIDATION_END
        ),
    }

    output_path.write_text(
        json.dumps(
            payload,
            indent=2,
        ),
        encoding="utf-8",
    )


def save_summary(
    metrics: pd.DataFrame,
    selected: pd.Series,
    output_path: Path,
) -> None:
    naive = metrics.loc[
        metrics[
            "model"
        ].eq(
            "naive"
        )
    ].iloc[0]

    table = metrics.to_string(
        index=False,
        float_format=lambda value: (
            f"{value:.4f}"
        ),
    )

    selected_mape = (
        "N/A"
        if pd.isna(
            selected["mape"]
        )
        else f"{float(selected['mape']):.4f}%"
    )

    naive_mape = (
        "N/A"
        if pd.isna(
            naive["mape"]
        )
        else f"{float(naive['mape']):.4f}%"
    )

    lines = [
        "KP-22 Moving Average baseline",
        "",
        f"Train end: {TRAIN_END}",
        (
            "Validation end: "
            f"{VALIDATION_END}"
        ),
        (
            "Test partition: reserved "
            "for final comparison"
        ),
        "",
        "Naive reference:",
        (
            f"MAE={float(naive['mae']):.4f}"
        ),
        (
            f"RMSE={float(naive['rmse']):.4f}"
        ),
        (
            f"MAPE={naive_mape}"
        ),
        "",
        (
            "Selected Moving Average "
            f"window: {int(selected['window'])}"
        ),
        (
            "Selection metric: "
            f"{BASELINE_SELECTION_METRIC.upper()}"
        ),
        (
            "Validation MAE: "
            f"{float(selected['mae']):.4f}"
        ),
        (
            "Validation RMSE: "
            f"{float(selected['rmse']):.4f}"
        ),
        (
            "Validation MAPE: "
            f"{selected_mape}"
        ),
        "",
        "All validation results:",
        table,
    ]

    output_path.write_text(
        "\n".join(
            lines
        ),
        encoding="utf-8",
    )


def run_baseline_experiment(
    dataset_path: Path,
    output_dir: Path,
) -> None:
    dataframe = load_processed_csv(
        dataset_path
    )

    naive_predictions = (
        build_naive_validation_predictions(
            dataframe,
            train_end=TRAIN_END,
            validation_end=VALIDATION_END,
        )
    )

    moving_average_predictions = (
        build_moving_average_validation_predictions(
            dataframe,
            train_end=TRAIN_END,
            validation_end=VALIDATION_END,
            windows=(
                MOVING_AVERAGE_WINDOWS
            ),
        )
    )

    predictions = pd.concat(
        [
            naive_predictions,
            moving_average_predictions,
        ],
        ignore_index=True,
    )

    metrics = evaluate_predictions(
        predictions
    )

    selected = (
        select_moving_average_baseline(
            metrics
        )
    )

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    predictions.to_csv(
        output_dir
        / "validation_predictions.csv",
        index=False,
        date_format="%Y-%m-%d",
    )

    metrics.to_csv(
        output_dir
        / "validation_metrics.csv",
        index=False,
    )

    save_selected_baseline(
        selected,
        output_dir
        / "selected_baseline.json",
    )

    save_summary(
        metrics,
        selected,
        output_dir
        / "summary.txt",
    )

    save_validation_plots(
        predictions,
        selected_window=int(
            selected["window"]
        ),
        output_dir=output_dir,
    )

    print(
        "Baseline experiment completed"
    )

    print(
        "Selected baseline: "
        "Moving Average "
        f"(window={int(selected['window'])})"
    )

    print(
        "Validation MAE: "
        f"{float(selected['mae']):.4f}"
    )

    print(
        "Validation RMSE: "
        f"{float(selected['rmse']):.4f}"
    )

    if pd.isna(
        selected["mape"]
    ):
        print(
            "Validation MAPE: N/A"
        )
    else:
        print(
            "Validation MAPE: "
            f"{float(selected['mape']):.4f}%"
        )

    print(
        f"Artifacts: {output_dir}"
    )


def _build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Run KP-22 baseline experiment."
        )
    )

    parser.add_argument(
        "dataset",
        type=Path,
        help=(
            "Processed daily demand dataset."
        ),
    )

    parser.add_argument(
        "output",
        type=Path,
        help=(
            "Directory for generated baseline artifacts."
        ),
    )

    return parser


def main() -> None:
    parser = (
        _build_argument_parser()
    )

    args = parser.parse_args()

    run_baseline_experiment(
        dataset_path=args.dataset,
        output_dir=args.output,
    )


if __name__ == "__main__":
    main()