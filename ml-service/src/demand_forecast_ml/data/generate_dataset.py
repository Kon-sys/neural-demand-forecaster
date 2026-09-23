from __future__ import annotations

import argparse
import math
import random
from pathlib import Path

import pandas as pd

from .contract import (
    DATE_COLUMN,
    PRODUCT_COLUMN,
    RAW_COLUMNS,
    TARGET_COLUMN,
)
from .validate import validate_raw_dataframe


def generate_synthetic_sales(
    *,
    start_date: str | pd.Timestamp,
    end_date: str | pd.Timestamp,
    product_count: int,
    seed: int,
) -> pd.DataFrame:
    """
    Generate deterministic synthetic daily product demand.

    The generated data is intended for development, testing and
    coursework experiments when sufficient real historical sales
    are not available.

    It must not be represented as real observed market data.
    """

    start = pd.Timestamp(start_date).normalize()
    end = pd.Timestamp(end_date).normalize()

    if pd.isna(start) or pd.isna(end):
        raise ValueError("Start and end dates must be valid dates.")

    if start > end:
        raise ValueError(
            "start_date must not be later than end_date."
        )

    if product_count <= 0:
        raise ValueError(
            "product_count must be greater than zero."
        )

    dates = pd.date_range(
        start=start,
        end=end,
        freq="D",
    )

    random_generator = random.Random(seed)

    rows: list[dict[str, object]] = []

    for product_index in range(product_count):
        product_number = product_index + 1
        product_sku = f"SYN-{product_number:03d}"

        base_demand = 30.0 + product_index * 10.0

        weekly_amplitude = 4.0 + product_index * 0.6
        annual_amplitude = 7.0 + product_index * 0.8

        trend_per_day = (
            0.004
            + product_index * 0.001
        )

        noise_standard_deviation = (
            2.5
            + product_index * 0.2
        )

        phase = product_index * 0.55

        for day_index, date in enumerate(dates):
            weekly_component = (
                weekly_amplitude
                * math.sin(
                    (2.0 * math.pi * date.dayofweek / 7.0)
                    + phase
                )
            )

            annual_component = (
                annual_amplitude
                * math.sin(
                    (
                        2.0
                        * math.pi
                        * date.dayofyear
                        / 365.25
                    )
                    + phase / 2.0
                )
            )

            trend_component = (
                trend_per_day
                * day_index
            )

            noise_component = random_generator.gauss(
                0.0,
                noise_standard_deviation,
            )

            demand = (
                base_demand
                + weekly_component
                + annual_component
                + trend_component
                + noise_component
            )

            quantity = max(
                0,
                int(round(demand)),
            )

            rows.append(
                {
                    PRODUCT_COLUMN: product_sku,
                    DATE_COLUMN: date,
                    TARGET_COLUMN: quantity,
                }
            )

    dataframe = pd.DataFrame(
        rows,
        columns=list(RAW_COLUMNS),
    )

    validate_raw_dataframe(dataframe)

    return dataframe


def save_synthetic_sales(
    dataframe: pd.DataFrame,
    output_path: str | Path,
) -> None:
    validate_raw_dataframe(dataframe)

    path = Path(output_path)
    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    dataframe.to_csv(
        path,
        index=False,
        date_format="%Y-%m-%d",
    )


def _build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Generate a reproducible synthetic raw demand dataset."
        )
    )

    parser.add_argument(
        "output",
        type=Path,
        help="Output CSV path.",
    )

    parser.add_argument(
        "--start",
        required=True,
        help="First generated calendar date.",
    )

    parser.add_argument(
        "--end",
        required=True,
        help="Last generated calendar date.",
    )

    parser.add_argument(
        "--products",
        type=int,
        required=True,
        help="Number of synthetic products.",
    )

    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed used for reproducibility.",
    )

    return parser


def main() -> None:
    parser = _build_argument_parser()
    args = parser.parse_args()

    dataframe = generate_synthetic_sales(
        start_date=args.start,
        end_date=args.end,
        product_count=args.products,
        seed=args.seed,
    )

    save_synthetic_sales(
        dataframe,
        args.output,
    )

    min_date = dataframe[DATE_COLUMN].min()
    max_date = dataframe[DATE_COLUMN].max()

    print("Synthetic dataset generated")
    print(f"Rows: {len(dataframe)}")
    print(
        "Products: "
        f"{dataframe[PRODUCT_COLUMN].nunique()}"
    )
    print(
        f"Date range: "
        f"{pd.Timestamp(min_date).date()} -> "
        f"{pd.Timestamp(max_date).date()}"
    )
    print(f"Seed: {args.seed}")
    print(f"Output: {args.output}")


if __name__ == "__main__":
    main()