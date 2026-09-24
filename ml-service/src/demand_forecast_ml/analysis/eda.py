from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import pandas as pd

from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    IMPUTED_COLUMN,
    PROCESSED_COLUMNS,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)

from demand_forecast_ml.data.inspect import (
    inspect_processed_dataframe,
    load_processed_csv,
)


DIAGNOSTIC_LAGS = (
    1,
    7,
    14,
    30,
    365,
)

WEEKDAY_NAMES = {
    0: "Monday",
    1: "Tuesday",
    2: "Wednesday",
    3: "Thursday",
    4: "Friday",
    5: "Saturday",
    6: "Sunday",
}

MONTH_NAMES = {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December",
}


def prepare_eda_dataframe(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    prepared = dataframe.copy()

    prepared[DATE_COLUMN] = pd.to_datetime(
        prepared[DATE_COLUMN],
        errors="raise",
    )

    prepared["day_of_week"] = (
        prepared[DATE_COLUMN].dt.dayofweek
    )

    prepared["weekday"] = (
        prepared["day_of_week"].map(WEEKDAY_NAMES)
    )

    prepared["month"] = (
        prepared[DATE_COLUMN].dt.month
    )

    prepared["month_name"] = (
        prepared["month"].map(MONTH_NAMES)
    )

    prepared["year_month"] = (
        prepared[DATE_COLUMN]
        .dt.to_period("M")
        .astype(str)
    )

    return prepared


def build_product_summary(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    records: list[dict[str, object]] = []

    for product_sku, group in dataframe.groupby(
        PRODUCT_COLUMN,
        sort=True,
    ):
        total_rows = len(group)

        imputed_rows = int(
            group[IMPUTED_COLUMN].sum()
        )

        zero_rows = int(
            group[TARGET_COLUMN].eq(0).sum()
        )

        records.append(
            {
                PRODUCT_COLUMN: product_sku,
                "first_date": group[DATE_COLUMN].min(),
                "last_date": group[DATE_COLUMN].max(),
                "rows": total_rows,
                "original_rows": total_rows - imputed_rows,
                "imputed_rows": imputed_rows,
                "imputation_rate": (
                    imputed_rows / total_rows
                    if total_rows
                    else 0.0
                ),
                "zero_demand_days": zero_rows,
                "zero_demand_rate": (
                    zero_rows / total_rows
                    if total_rows
                    else 0.0
                ),
                "total_quantity": int(
                    group[TARGET_COLUMN].sum()
                ),
                "mean_quantity": float(
                    group[TARGET_COLUMN].mean()
                ),
                "median_quantity": float(
                    group[TARGET_COLUMN].median()
                ),
                "std_quantity": float(
                    group[TARGET_COLUMN].std()
                ),
                "min_quantity": int(
                    group[TARGET_COLUMN].min()
                ),
                "max_quantity": int(
                    group[TARGET_COLUMN].max()
                ),
            }
        )

    summary = pd.DataFrame(records)

    summary["std_quantity"] = (
        summary["std_quantity"].fillna(0.0)
    )

    return summary


def build_weekday_summary(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    summary = (
        dataframe
        .groupby(
            [
                "day_of_week",
                "weekday",
            ],
            as_index=False,
        )
        .agg(
            observations=(TARGET_COLUMN, "size"),
            total_quantity=(TARGET_COLUMN, "sum"),
            mean_quantity=(TARGET_COLUMN, "mean"),
            median_quantity=(TARGET_COLUMN, "median"),
        )
        .sort_values("day_of_week")
        .reset_index(drop=True)
    )

    return summary


def build_month_summary(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    summary = (
        dataframe
        .groupby(
            [
                "month",
                "month_name",
            ],
            as_index=False,
        )
        .agg(
            observations=(TARGET_COLUMN, "size"),
            total_quantity=(TARGET_COLUMN, "sum"),
            mean_quantity=(TARGET_COLUMN, "mean"),
            median_quantity=(TARGET_COLUMN, "median"),
        )
        .sort_values("month")
        .reset_index(drop=True)
    )

    return summary


def build_monthly_time_series(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    monthly = (
        dataframe
        .groupby(
            "year_month",
            as_index=False,
        )
        .agg(
            total_quantity=(TARGET_COLUMN, "sum"),
            mean_quantity=(TARGET_COLUMN, "mean"),
        )
    )

    return monthly


def build_autocorrelation_summary(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    records: list[dict[str, object]] = []

    for product_sku, group in dataframe.groupby(
        PRODUCT_COLUMN,
        sort=True,
    ):
        ordered = group.sort_values(
            DATE_COLUMN
        )

        series = ordered[TARGET_COLUMN]

        for lag in DIAGNOSTIC_LAGS:
            correlation = pd.NA

            if len(series) > lag:
                value = series.autocorr(
                    lag=lag
                )

                if pd.notna(value):
                    correlation = float(value)

            records.append(
                {
                    PRODUCT_COLUMN: product_sku,
                    "lag_days": lag,
                    "autocorrelation": correlation,
                }
            )

    return pd.DataFrame(records)


def save_total_demand_plot(
    dataframe: pd.DataFrame,
    output_path: Path,
) -> None:
    daily = (
        dataframe
        .groupby(
            DATE_COLUMN,
            as_index=False,
        )[TARGET_COLUMN]
        .sum()
    )

    figure, axis = plt.subplots(
        figsize=(13, 6)
    )

    axis.plot(
        daily[DATE_COLUMN],
        daily[TARGET_COLUMN],
        linewidth=1.2,
    )

    axis.set_title(
        "Total daily demand"
    )

    axis.set_xlabel(
        "Date"
    )

    axis.set_ylabel(
        "Quantity"
    )

    axis.grid(
        alpha=0.25
    )

    figure.tight_layout()

    figure.savefig(
        output_path,
        dpi=150,
    )

    plt.close(figure)


def save_product_demand_plot(
    dataframe: pd.DataFrame,
    product_summary: pd.DataFrame,
    output_path: Path,
) -> None:
    top_products = (
        product_summary
        .sort_values(
            "total_quantity",
            ascending=False,
        )
        .head(12)[PRODUCT_COLUMN]
        .tolist()
    )

    selected = dataframe[
        dataframe[PRODUCT_COLUMN].isin(
            top_products
        )
    ]

    figure, axis = plt.subplots(
        figsize=(14, 7)
    )

    for product_sku, group in selected.groupby(
        PRODUCT_COLUMN,
        sort=True,
    ):
        ordered = group.sort_values(
            DATE_COLUMN
        )

        axis.plot(
            ordered[DATE_COLUMN],
            ordered[TARGET_COLUMN],
            linewidth=1,
            label=product_sku,
        )

    axis.set_title(
        "Daily demand by product"
    )

    axis.set_xlabel(
        "Date"
    )

    axis.set_ylabel(
        "Quantity"
    )

    axis.legend(
        loc="best",
        fontsize=8,
    )

    axis.grid(
        alpha=0.2
    )

    figure.tight_layout()

    figure.savefig(
        output_path,
        dpi=150,
    )

    plt.close(figure)


def save_distribution_plot(
    dataframe: pd.DataFrame,
    output_path: Path,
) -> None:
    figure, axis = plt.subplots(
        figsize=(10, 6)
    )

    axis.hist(
        dataframe[TARGET_COLUMN],
        bins=40,
    )

    axis.set_title(
        "Demand distribution"
    )

    axis.set_xlabel(
        "Daily quantity"
    )

    axis.set_ylabel(
        "Frequency"
    )

    figure.tight_layout()

    figure.savefig(
        output_path,
        dpi=150,
    )

    plt.close(figure)


def save_product_boxplot(
    dataframe: pd.DataFrame,
    product_summary: pd.DataFrame,
    output_path: Path,
) -> None:
    top_products = (
        product_summary
        .sort_values(
            "total_quantity",
            ascending=False,
        )
        .head(12)[PRODUCT_COLUMN]
        .tolist()
    )

    values: list[pd.Series] = []

    for product_sku in top_products:
        quantities = dataframe.loc[
            dataframe[PRODUCT_COLUMN]
            == product_sku,
            TARGET_COLUMN,
        ]

        values.append(
            quantities
        )

    figure, axis = plt.subplots(
        figsize=(12, 6)
    )

    axis.boxplot(
        values,
        tick_labels=top_products,
        showfliers=True,
    )

    axis.set_title(
        "Demand variability by product"
    )

    axis.set_xlabel(
        "Product"
    )

    axis.set_ylabel(
        "Daily quantity"
    )

    axis.tick_params(
        axis="x",
        rotation=45,
    )

    figure.tight_layout()

    figure.savefig(
        output_path,
        dpi=150,
    )

    plt.close(figure)


def save_weekday_plot(
    weekday_summary: pd.DataFrame,
    output_path: Path,
) -> None:
    figure, axis = plt.subplots(
        figsize=(10, 6)
    )

    axis.bar(
        weekday_summary["weekday"],
        weekday_summary["mean_quantity"],
    )

    axis.set_title(
        "Mean demand by weekday"
    )

    axis.set_xlabel(
        "Weekday"
    )

    axis.set_ylabel(
        "Mean daily quantity"
    )

    axis.tick_params(
        axis="x",
        rotation=30,
    )

    figure.tight_layout()

    figure.savefig(
        output_path,
        dpi=150,
    )

    plt.close(figure)


def save_month_plot(
    month_summary: pd.DataFrame,
    output_path: Path,
) -> None:
    figure, axis = plt.subplots(
        figsize=(12, 6)
    )

    axis.bar(
        month_summary["month_name"],
        month_summary["mean_quantity"],
    )

    axis.set_title(
        "Mean demand by calendar month"
    )

    axis.set_xlabel(
        "Month"
    )

    axis.set_ylabel(
        "Mean daily quantity"
    )

    axis.tick_params(
        axis="x",
        rotation=45,
    )

    figure.tight_layout()

    figure.savefig(
        output_path,
        dpi=150,
    )

    plt.close(figure)


def save_autocorrelation_plot(
    autocorrelation_summary: pd.DataFrame,
    output_path: Path,
) -> None:
    valid = autocorrelation_summary.dropna(
        subset=["autocorrelation"]
    )

    aggregated = (
        valid
        .groupby(
            "lag_days",
            as_index=False,
        )
        .agg(
            median_autocorrelation=(
                "autocorrelation",
                "median",
            )
        )
    )

    figure, axis = plt.subplots(
        figsize=(9, 6)
    )

    axis.bar(
        aggregated["lag_days"].astype(str),
        aggregated["median_autocorrelation"],
    )

    axis.axhline(
        0,
        linewidth=1,
    )

    axis.set_title(
        "Median demand autocorrelation"
    )

    axis.set_xlabel(
        "Lag, days"
    )

    axis.set_ylabel(
        "Autocorrelation"
    )

    figure.tight_layout()

    figure.savefig(
        output_path,
        dpi=150,
    )

    plt.close(figure)


def save_text_summary(
    dataframe: pd.DataFrame,
    product_summary: pd.DataFrame,
    label: str,
    output_path: Path,
) -> None:
    inspection = inspect_processed_dataframe(
        dataframe.loc[:, list(PROCESSED_COLUMNS)].copy()
    )

    quantity = dataframe[TARGET_COLUMN]

    zero_rows = int(
        quantity.eq(0).sum()
    )

    zero_rate = (
        zero_rows / len(dataframe)
        if len(dataframe)
        else 0.0
    )

    lines = [
        f"Dataset: {label}",
        "",
        f"Rows: {inspection.summary.rows}",
        f"Products: {inspection.summary.products}",
        (
            "Date range: "
            f"{inspection.summary.min_date.date()} -> "
            f"{inspection.summary.max_date.date()}"
        ),
        "",
        (
            "Original observations: "
            f"{inspection.original_rows}"
        ),
        (
            "Imputed observations: "
            f"{inspection.imputed_rows}"
        ),
        (
            "Imputation rate: "
            f"{inspection.imputation_rate:.2%}"
        ),
        "",
        f"Total quantity: {int(quantity.sum())}",
        f"Mean quantity: {quantity.mean():.2f}",
        f"Median quantity: {quantity.median():.2f}",
        f"Standard deviation: {quantity.std():.2f}",
        f"Minimum quantity: {int(quantity.min())}",
        f"Maximum quantity: {int(quantity.max())}",
        "",
        f"Zero-demand rows: {zero_rows}",
        f"Zero-demand rate: {zero_rate:.2%}",
        "",
        (
            "Minimum series length: "
            f"{int(product_summary['rows'].min())}"
        ),
        (
            "Median series length: "
            f"{product_summary['rows'].median():.1f}"
        ),
        (
            "Maximum series length: "
            f"{int(product_summary['rows'].max())}"
        ),
    ]

    output_path.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )


def run_eda(
    dataset_path: Path,
    output_dir: Path,
    label: str,
) -> None:
    dataframe = load_processed_csv(
        dataset_path
    )

    inspection = inspect_processed_dataframe(
        dataframe
    )

    dataframe = prepare_eda_dataframe(
        dataframe
    )

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    product_summary = build_product_summary(
        dataframe
    )

    weekday_summary = build_weekday_summary(
        dataframe
    )

    month_summary = build_month_summary(
        dataframe
    )

    monthly_time_series = (
        build_monthly_time_series(
            dataframe
        )
    )

    autocorrelation_summary = (
        build_autocorrelation_summary(
            dataframe
        )
    )

    product_summary.to_csv(
        output_dir / "product_summary.csv",
        index=False,
    )

    weekday_summary.to_csv(
        output_dir / "weekday_summary.csv",
        index=False,
    )

    month_summary.to_csv(
        output_dir / "month_summary.csv",
        index=False,
    )

    monthly_time_series.to_csv(
        output_dir / "monthly_time_series.csv",
        index=False,
    )

    autocorrelation_summary.to_csv(
        output_dir / "autocorrelation_summary.csv",
        index=False,
    )

    save_text_summary(
        dataframe,
        product_summary,
        label,
        output_dir / "summary.txt",
    )

    save_total_demand_plot(
        dataframe,
        output_dir / "01_total_demand_over_time.png",
    )

    save_product_demand_plot(
        dataframe,
        product_summary,
        output_dir / "02_product_demand_over_time.png",
    )

    save_distribution_plot(
        dataframe,
        output_dir / "03_demand_distribution.png",
    )

    save_product_boxplot(
        dataframe,
        product_summary,
        output_dir / "04_demand_by_product_boxplot.png",
    )

    save_weekday_plot(
        weekday_summary,
        output_dir / "05_weekday_profile.png",
    )

    save_month_plot(
        month_summary,
        output_dir / "06_month_profile.png",
    )

    save_autocorrelation_plot(
        autocorrelation_summary,
        output_dir / "07_autocorrelation.png",
    )

    print("EDA completed")
    print(f"Dataset: {label}")
    print(f"Rows: {inspection.summary.rows}")
    print(f"Products: {inspection.summary.products}")
    print(
        "Date range: "
        f"{inspection.summary.min_date.date()} -> "
        f"{inspection.summary.max_date.date()}"
    )
    print(
        "Imputation rate: "
        f"{inspection.imputation_rate:.2%}"
    )
    print(
        f"Mean quantity: "
        f"{dataframe[TARGET_COLUMN].mean():.2f}"
    )
    print(
        f"Median quantity: "
        f"{dataframe[TARGET_COLUMN].median():.2f}"
    )
    print(f"Artifacts: {output_dir}")


def _build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Run exploratory data analysis "
            "for a processed demand dataset."
        )
    )

    parser.add_argument(
        "dataset",
        type=Path,
        help="Processed dataset CSV.",
    )

    parser.add_argument(
        "output",
        type=Path,
        help="Directory for generated EDA artifacts.",
    )

    parser.add_argument(
        "--label",
        default="Demand dataset",
        help="Human-readable dataset label.",
    )

    return parser


def main() -> None:
    parser = _build_argument_parser()
    args = parser.parse_args()

    run_eda(
        dataset_path=args.dataset,
        output_dir=args.output,
        label=args.label,
    )


if __name__ == "__main__":
    main()