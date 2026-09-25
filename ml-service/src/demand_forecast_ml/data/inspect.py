from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from .contract import (
    DATE_COLUMN,
    IMPUTED_COLUMN,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
    UNIQUE_KEY,
)
from .validate import (
    DatasetSummary,
    validate_processed_dataframe,
)


@dataclass(frozen=True, slots=True)
class DatasetInspection:
    """Structural quality report for a processed demand dataset."""

    summary: DatasetSummary
    original_rows: int
    imputed_rows: int
    imputation_rate: float
    zero_demand_rows: int
    total_quantity: int
    min_series_length: int
    median_series_length: float
    max_series_length: int
    missing_values: int
    duplicate_keys: int
    negative_quantities: int


def load_processed_csv(path: str | Path) -> pd.DataFrame:
    csv_path = Path(path)

    if not csv_path.exists():
        raise FileNotFoundError(
            f"Processed dataset does not exist: {csv_path}"
        )

    if not csv_path.is_file():
        raise ValueError(
            f"Processed dataset path is not a file: {csv_path}"
        )

    dataframe = pd.read_csv(
        csv_path,
        dtype={
            PRODUCT_COLUMN: "string",
        },
        parse_dates=[
            DATE_COLUMN,
        ],
    )

    if dataframe[IMPUTED_COLUMN].dtype != bool:
        normalized_imputed = (
            dataframe[IMPUTED_COLUMN]
            .astype(str)
            .str.strip()
            .str.lower()
        )

        mapping = {
            "true": True,
            "false": False,
        }

        dataframe[IMPUTED_COLUMN] = normalized_imputed.map(mapping)

    return dataframe


def inspect_processed_dataframe(
    dataframe: pd.DataFrame,
) -> DatasetInspection:
    summary = validate_processed_dataframe(dataframe)

    total_rows = len(dataframe)

    imputed_rows = int(
        dataframe[IMPUTED_COLUMN].sum()
    )

    original_rows = total_rows - imputed_rows

    imputation_rate = (
        imputed_rows / total_rows
        if total_rows > 0
        else 0.0
    )

    zero_demand_rows = int(
        dataframe[TARGET_COLUMN].eq(0).sum()
    )

    total_quantity = int(
        dataframe[TARGET_COLUMN].sum()
    )

    series_lengths = (
        dataframe
        .groupby(PRODUCT_COLUMN, sort=True)
        .size()
    )

    missing_values = int(
        dataframe.isna().sum().sum()
    )

    duplicate_keys = int(
        dataframe.duplicated(
            subset=list(UNIQUE_KEY),
            keep=False,
        ).sum()
    )

    negative_quantities = int(
        dataframe[TARGET_COLUMN].lt(0).sum()
    )

    return DatasetInspection(
        summary=summary,
        original_rows=original_rows,
        imputed_rows=imputed_rows,
        imputation_rate=imputation_rate,
        zero_demand_rows=zero_demand_rows,
        total_quantity=total_quantity,
        min_series_length=int(series_lengths.min()),
        median_series_length=float(series_lengths.median()),
        max_series_length=int(series_lengths.max()),
        missing_values=missing_values,
        duplicate_keys=duplicate_keys,
        negative_quantities=negative_quantities,
    )


def inspect_processed_csv(
    path: str | Path,
) -> DatasetInspection:
    dataframe = load_processed_csv(path)

    return inspect_processed_dataframe(dataframe)


def print_inspection(
    inspection: DatasetInspection,
) -> None:
    summary = inspection.summary

    print("Dataset validation passed")
    print()
    print(f"Rows: {summary.rows}")
    print(f"Products: {summary.products}")
    print(
        "Date range: "
        f"{summary.min_date.date()} -> {summary.max_date.date()}"
    )
    print()
    print(f"Original observations: {inspection.original_rows}")
    print(f"Imputed observations: {inspection.imputed_rows}")
    print(
        "Imputation rate: "
        f"{inspection.imputation_rate:.2%}"
    )
    print(f"Zero-demand rows: {inspection.zero_demand_rows}")
    print(f"Total quantity: {inspection.total_quantity}")
    print()
    print(
        "Series length: "
        f"min={inspection.min_series_length}, "
        f"median={inspection.median_series_length:.1f}, "
        f"max={inspection.max_series_length}"
    )
    print()
    print(f"Missing values: {inspection.missing_values}")
    print(f"Duplicate product/date pairs: {inspection.duplicate_keys}")
    print(f"Negative quantities: {inspection.negative_quantities}")


def _build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Validate and inspect a processed demand dataset "
            "before exploratory data analysis."
        )
    )

    parser.add_argument(
        "dataset",
        type=Path,
        help="Path to the processed CSV dataset.",
    )

    return parser


def main() -> None:
    parser = _build_argument_parser()
    args = parser.parse_args()

    inspection = inspect_processed_csv(args.dataset)

    print_inspection(inspection)


if __name__ == "__main__":
    main()