from __future__ import annotations

import argparse
import math
from pathlib import Path

import pandas as pd

from .contract import (
    DATE_COLUMN,
    IMPUTED_COLUMN,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from .validate import (
    validate_processed_dataframe,
)


DEFAULT_SERIES_COUNT = 300

PAIR_COLUMNS = (
    "store_id",
    "product_id",
)

SOURCE_COLUMNS = (
    "city_id",
    "store_id",
    "management_group_id",
    "first_category_id",
    "second_category_id",
    "third_category_id",
    "product_id",
    "dt",
    "sale_amount",
)


def _validate_source_columns(
    dataframe: pd.DataFrame,
) -> None:
    missing = [
        column
        for column in SOURCE_COLUMNS
        if column not in dataframe.columns
    ]

    if missing:
        raise ValueError(
            "FreshRetail dataset is missing required columns: "
            + ", ".join(
                missing
            )
        )


def _normalize_source(
    dataframe: pd.DataFrame,
    *,
    source_name: str,
) -> pd.DataFrame:
    _validate_source_columns(
        dataframe
    )

    normalized = dataframe.loc[
        :,
        list(
            SOURCE_COLUMNS
        ),
    ].copy()

    normalized[
        "dt"
    ] = (
        pd.to_datetime(
            normalized[
                "dt"
            ],
            errors="raise",
        )
        .dt.normalize()
    )

    normalized[
        "sale_amount"
    ] = (
        pd.to_numeric(
            normalized[
                "sale_amount"
            ],
            errors="raise",
        )
        .astype(
            "float64"
        )
    )

    finite_mask = normalized[
        "sale_amount"
    ].map(
        math.isfinite
    )

    if not finite_mask.all():
        raise ValueError(
            f"{source_name} contains non-finite sale_amount values."
        )

    if normalized[
        "sale_amount"
    ].lt(
        0
    ).any():
        raise ValueError(
            f"{source_name} contains negative sale_amount values."
        )

    duplicate_mask = normalized.duplicated(
        subset=[
            "store_id",
            "product_id",
            "dt",
        ],
        keep=False,
    )

    if duplicate_mask.any():
        raise ValueError(
            f"{source_name} contains duplicate "
            "store/product/date observations."
        )

    return normalized


def _expected_dates(
    dataframe: pd.DataFrame,
) -> pd.DatetimeIndex:
    dates = pd.DatetimeIndex(
        dataframe[
            "dt"
        ]
        .drop_duplicates()
        .sort_values()
    )

    if dates.empty:
        raise ValueError(
            "FreshRetail source contains no dates."
        )

    expected = pd.date_range(
        start=dates.min(),
        end=dates.max(),
        freq="D",
    )

    if not dates.equals(
        expected
    ):
        raise ValueError(
            "FreshRetail source does not contain a continuous daily calendar."
        )

    return expected


def _build_series_statistics(
    train: pd.DataFrame,
) -> pd.DataFrame:
    working = train.copy()

    working[
        "_positive_day"
    ] = (
        working[
            "sale_amount"
        ]
        .gt(
            0
        )
        .astype(
            "int64"
        )
    )

    statistics = (
        working
        .groupby(
            list(
                PAIR_COLUMNS
            ),
            as_index=False,
        )
        .agg(
            city_id=(
                "city_id",
                "first",
            ),
            management_group_id=(
                "management_group_id",
                "first",
            ),
            first_category_id=(
                "first_category_id",
                "first",
            ),
            second_category_id=(
                "second_category_id",
                "first",
            ),
            third_category_id=(
                "third_category_id",
                "first",
            ),
            train_days=(
                "dt",
                "nunique",
            ),
            train_nonzero_days=(
                "_positive_day",
                "sum",
            ),
            train_total_sales=(
                "sale_amount",
                "sum",
            ),
        )
    )

    return statistics


def select_series(
    train: pd.DataFrame,
    *,
    series_count: int = DEFAULT_SERIES_COUNT,
) -> pd.DataFrame:
    """
    Select a deterministic and category-balanced subset.

    Selection uses TRAIN only.

    Inside each first-level category series are ranked by:
    1. number of non-zero demand days;
    2. total TRAIN sales;
    3. store_id;
    4. product_id.

    Categories are then sampled in round-robin order so that one
    first_category_id does not dominate the final subset.
    """

    if series_count <= 0:
        raise ValueError(
            "series_count must be greater than zero."
        )

    expected_dates = _expected_dates(
        train
    )

    statistics = (
        _build_series_statistics(
            train
        )
    )

    eligible = statistics.loc[
        (
            statistics[
                "train_days"
            ].eq(
                len(
                    expected_dates
                )
            )
        )
        & (
            statistics[
                "train_total_sales"
            ].gt(
                0
            )
        )
    ].copy()

    if len(
        eligible
    ) < series_count:
        raise ValueError(
            "Not enough complete active series "
            f"to select {series_count} observations."
        )

    categories = sorted(
        eligible[
            "first_category_id"
        ].unique()
    )

    ranked_by_category: dict[
        int,
        pd.DataFrame,
    ] = {}

    for category in categories:
        ranked = (
            eligible.loc[
                eligible[
                    "first_category_id"
                ].eq(
                    category
                )
            ]
            .sort_values(
                by=[
                    "train_nonzero_days",
                    "train_total_sales",
                    "store_id",
                    "product_id",
                ],
                ascending=[
                    False,
                    False,
                    True,
                    True,
                ],
                kind="stable",
            )
            .reset_index(
                drop=True
            )
        )

        ranked_by_category[
            int(
                category
            )
        ] = ranked

    selected_records: list[
        dict[str, object]
    ] = []

    positions = {
        int(
            category
        ): 0
        for category in categories
    }

    while len(
        selected_records
    ) < series_count:
        progress = False

        for category in categories:
            category_key = int(
                category
            )

            ranked = (
                ranked_by_category[
                    category_key
                ]
            )

            position = positions[
                category_key
            ]

            if position >= len(
                ranked
            ):
                continue

            selected_records.append(
                ranked.iloc[
                    position
                ].to_dict()
            )

            positions[
                category_key
            ] += 1

            progress = True

            if len(
                selected_records
            ) == series_count:
                break

        if not progress:
            break

    if len(
        selected_records
    ) != series_count:
        raise ValueError(
            "Unable to build requested category-balanced subset."
        )

    selected = pd.DataFrame(
        selected_records
    )

    return selected.reset_index(
        drop=True
    )


def _filter_selected(
    dataframe: pd.DataFrame,
    selected_series: pd.DataFrame,
) -> pd.DataFrame:
    selected_keys = (
        selected_series.loc[
            :,
            list(
                PAIR_COLUMNS
            ),
        ]
        .drop_duplicates()
    )

    return dataframe.merge(
        selected_keys,
        on=list(
            PAIR_COLUMNS
        ),
        how="inner",
        validate="many_to_one",
    )


def _validate_selected_coverage(
    dataframe: pd.DataFrame,
    *,
    expected_dates: pd.DatetimeIndex,
    series_count: int,
    source_name: str,
) -> None:
    expected_rows = (
        len(
            expected_dates
        )
        * series_count
    )

    if len(
        dataframe
    ) != expected_rows:
        raise ValueError(
            f"{source_name} selected subset has "
            f"{len(dataframe)} rows; "
            f"expected {expected_rows}."
        )

    coverage = (
        dataframe
        .groupby(
            list(
                PAIR_COLUMNS
            )
        )[
            "dt"
        ]
        .nunique()
    )

    if not coverage.eq(
        len(
            expected_dates
        )
    ).all():
        raise ValueError(
            f"{source_name} contains incomplete selected series."
        )


def convert_selected_dataset(
    train: pd.DataFrame,
    evaluation: pd.DataFrame,
    selected_series: pd.DataFrame,
) -> pd.DataFrame:
    train_dates = _expected_dates(
        train
    )

    evaluation_dates = (
        _expected_dates(
            evaluation
        )
    )

    if (
        train_dates.max()
        + pd.Timedelta(
            days=1
        )
        != evaluation_dates.min()
    ):
        raise ValueError(
            "FreshRetail TRAIN and EVAL periods must be consecutive."
        )

    selected_train = (
        _filter_selected(
            train,
            selected_series,
        )
    )

    selected_evaluation = (
        _filter_selected(
            evaluation,
            selected_series,
        )
    )

    series_count = len(
        selected_series
    )

    _validate_selected_coverage(
        selected_train,
        expected_dates=train_dates,
        series_count=series_count,
        source_name="TRAIN",
    )

    _validate_selected_coverage(
        selected_evaluation,
        expected_dates=evaluation_dates,
        series_count=series_count,
        source_name="EVAL",
    )

    combined = pd.concat(
        [
            selected_train,
            selected_evaluation,
        ],
        ignore_index=True,
    )

    processed = pd.DataFrame(
        {
            PRODUCT_COLUMN: (
                "STORE_"
                + combined[
                    "store_id"
                ].astype(
                    str
                )
                + "_PRODUCT_"
                + combined[
                    "product_id"
                ].astype(
                    str
                )
            ),
            DATE_COLUMN: (
                combined[
                    "dt"
                ]
            ),
            TARGET_COLUMN: (
                combined[
                    "sale_amount"
                ].astype(
                    "float64"
                )
            ),
            IMPUTED_COLUMN: False,
        }
    )

    processed = (
        processed
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

    validate_processed_dataframe(
        processed
    )

    return processed


def prepare_freshretail_dataset(
    *,
    train_path: Path,
    evaluation_path: Path,
    output_path: Path,
    selected_series_path: Path,
    series_count: int = DEFAULT_SERIES_COUNT,
) -> None:
    train = pd.read_parquet(
        train_path,
        columns=list(
            SOURCE_COLUMNS
        ),
    )

    evaluation = pd.read_parquet(
        evaluation_path,
        columns=list(
            SOURCE_COLUMNS
        ),
    )

    train = _normalize_source(
        train,
        source_name="TRAIN",
    )

    evaluation = _normalize_source(
        evaluation,
        source_name="EVAL",
    )

    selected_series = select_series(
        train,
        series_count=series_count,
    )

    processed = convert_selected_dataset(
        train,
        evaluation,
        selected_series,
    )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    selected_series_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    processed.to_csv(
        output_path,
        index=False,
        date_format="%Y-%m-%d",
    )

    selected_series.to_csv(
        selected_series_path,
        index=False,
    )

    train_min = train[
        "dt"
    ].min()

    train_max = train[
        "dt"
    ].max()

    eval_min = evaluation[
        "dt"
    ].min()

    eval_max = evaluation[
        "dt"
    ].max()

    print(
        "FreshRetail dataset preparation completed"
    )

    print(
        f"Selected series: {len(selected_series)}"
    )

    print(
        f"Processed rows: {len(processed)}"
    )

    print(
        "TRAIN source: "
        f"{train_min.date()} "
        "-> "
        f"{train_max.date()}"
    )

    print(
        "EVAL source: "
        f"{eval_min.date()} "
        "-> "
        f"{eval_max.date()}"
    )

    print(
        "Processed range: "
        f"{processed[DATE_COLUMN].min().date()} "
        "-> "
        f"{processed[DATE_COLUMN].max().date()}"
    )

    print(
        "First-level categories: "
        f"{selected_series['first_category_id'].nunique()}"
    )

    print(
        f"Output: {output_path}"
    )

    print(
        "Selected series: "
        f"{selected_series_path}"
    )


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Convert FreshRetailNet-50K data "
            "to the Demand Forecast ML contract."
        )
    )

    parser.add_argument(
        "train",
        type=Path,
    )

    parser.add_argument(
        "evaluation",
        type=Path,
    )

    parser.add_argument(
        "output",
        type=Path,
    )

    parser.add_argument(
        "selected_series",
        type=Path,
    )

    parser.add_argument(
        "--series-count",
        type=int,
        default=DEFAULT_SERIES_COUNT,
    )

    return parser


def main() -> None:
    parser = (
        _build_parser()
    )

    args = (
        parser.parse_args()
    )

    prepare_freshretail_dataset(
        train_path=args.train,
        evaluation_path=args.evaluation,
        output_path=args.output,
        selected_series_path=(
            args.selected_series
        ),
        series_count=args.series_count,
    )


if __name__ == "__main__":
    main()