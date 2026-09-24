from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from .contract import (
    DATE_COLUMN,
    IMPUTED_COLUMN,
    PROCESSED_COLUMNS,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
    TIME_FREQUENCY,
)
from .validate import (
    DatasetSummary,
    validate_processed_dataframe,
    validate_raw_dataframe,
)


def load_raw_csv(
    path: str | Path,
) -> pd.DataFrame:
    """
    Load a raw sales CSV file.

    Expected columns:
        product_sku
        date
        quantity
    """

    csv_path = Path(
        path
    )

    if not csv_path.exists():
        raise FileNotFoundError(
            f"Raw dataset does not exist: {csv_path}"
        )

    if not csv_path.is_file():
        raise ValueError(
            f"Raw dataset path is not a file: {csv_path}"
        )

    dataframe = pd.read_csv(
        csv_path,
        dtype={
            PRODUCT_COLUMN: "string",
        },
    )

    return dataframe


def normalize_raw_dataframe(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Normalize raw values without changing their business meaning.

    Operations:
        - trim product SKU values;
        - convert dates to normalized calendar dates;
        - convert quantities to float64;
        - sort observations by product and date.
    """

    validate_raw_dataframe(
        dataframe
    )

    normalized = dataframe.copy()

    normalized[
        PRODUCT_COLUMN
    ] = (
        normalized[
            PRODUCT_COLUMN
        ]
        .astype("string")
        .str.strip()
    )

    normalized[
        DATE_COLUMN
    ] = (
        pd.to_datetime(
            normalized[
                DATE_COLUMN
            ],
            errors="raise",
        )
        .dt.normalize()
    )

    normalized[
        TARGET_COLUMN
    ] = (
        pd.to_numeric(
            normalized[
                TARGET_COLUMN
            ],
            errors="raise",
        )
        .astype(
            "float64"
        )
    )

    normalized = normalized.sort_values(
        by=[
            PRODUCT_COLUMN,
            DATE_COLUMN,
        ],
        kind="stable",
    ).reset_index(
        drop=True
    )

    # Validate again after normalization because two different raw values
    # could collapse to the same logical product/date key.
    validate_raw_dataframe(
        normalized
    )

    return normalized


def prepare_daily_dataset(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Transform raw sales observations into continuous daily time series.

    A separate daily calendar is created for each product from its first
    observed date through its last observed date.

    Missing dates inside that interval are restored with:
        quantity = 0.0
        is_imputed = True

    Original observations receive:
        is_imputed = False
    """

    normalized = normalize_raw_dataframe(
        dataframe
    )

    prepared_frames: list[
        pd.DataFrame
    ] = []

    for product_sku, product_data in normalized.groupby(
        PRODUCT_COLUMN,
        sort=True,
    ):
        product_data = (
            product_data
            .sort_values(
                DATE_COLUMN,
                kind="stable",
            )
        )

        start_date = product_data[
            DATE_COLUMN
        ].min()

        end_date = product_data[
            DATE_COLUMN
        ].max()

        full_calendar = pd.date_range(
            start=start_date,
            end=end_date,
            freq=TIME_FREQUENCY,
        )

        observed_quantities = (
            product_data
            .set_index(
                DATE_COLUMN
            )[
                TARGET_COLUMN
            ]
            .reindex(
                full_calendar
            )
        )

        imputed_mask = (
            observed_quantities
            .isna()
        )

        daily_product = pd.DataFrame(
            {
                PRODUCT_COLUMN: (
                    product_sku
                ),
                DATE_COLUMN: (
                    full_calendar
                ),
                TARGET_COLUMN: (
                    observed_quantities
                    .fillna(
                        0.0
                    )
                    .astype(
                        "float64"
                    )
                    .to_numpy()
                ),
                IMPUTED_COLUMN: (
                    imputed_mask
                    .to_numpy(
                        dtype=bool
                    )
                ),
            }
        )

        prepared_frames.append(
            daily_product
        )

    processed = pd.concat(
        prepared_frames,
        ignore_index=True,
    )

    processed = processed.loc[
        :,
        list(
            PROCESSED_COLUMNS
        ),
    ]

    processed = processed.sort_values(
        by=[
            PRODUCT_COLUMN,
            DATE_COLUMN,
        ],
        kind="stable",
    ).reset_index(
        drop=True
    )

    validate_processed_dataframe(
        processed
    )

    return processed


def save_processed_csv(
    dataframe: pd.DataFrame,
    path: str | Path,
) -> DatasetSummary:
    """
    Validate and save a processed dataset as CSV.
    """

    summary = (
        validate_processed_dataframe(
            dataframe
        )
    )

    output_path = Path(
        path
    )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    dataframe.to_csv(
        output_path,
        index=False,
        date_format="%Y-%m-%d",
    )

    return summary


def prepare_csv(
    input_path: str | Path,
    output_path: str | Path,
) -> DatasetSummary:
    """
    Run the complete raw CSV -> processed CSV pipeline.
    """

    raw_dataframe = load_raw_csv(
        input_path
    )

    processed_dataframe = (
        prepare_daily_dataset(
            raw_dataframe
        )
    )

    return save_processed_csv(
        processed_dataframe,
        output_path,
    )


def _build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Prepare a continuous daily demand dataset "
            "from raw product sales observations."
        )
    )

    parser.add_argument(
        "input",
        type=Path,
        help=(
            "Path to the raw CSV dataset."
        ),
    )

    parser.add_argument(
        "output",
        type=Path,
        help=(
            "Path for the processed CSV dataset."
        ),
    )

    return parser


def main() -> None:
    parser = (
        _build_argument_parser()
    )

    args = parser.parse_args()

    summary = prepare_csv(
        input_path=args.input,
        output_path=args.output,
    )

    processed = pd.read_csv(
        args.output
    )

    imputed_rows = int(
        processed[
            IMPUTED_COLUMN
        ]
        .astype(str)
        .str.lower()
        .eq("true")
        .sum()
    )

    print(
        "Dataset preparation completed"
    )

    print(
        f"Rows: {summary.rows}"
    )

    print(
        f"Products: {summary.products}"
    )

    print(
        "Date range: "
        f"{summary.min_date.date()} "
        "-> "
        f"{summary.max_date.date()}"
    )

    print(
        f"Imputed observations: {imputed_rows}"
    )

    print(
        f"Output: {args.output}"
    )


if __name__ == "__main__":
    main()