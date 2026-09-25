from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    IMPUTED_COLUMN,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from demand_forecast_ml.data.validate import (
    validate_processed_dataframe,
)


DEFAULT_STORE = "CA_1"
DEFAULT_PRODUCTS_PER_CATEGORY = 10
DEFAULT_TRAIN_LAST_DAY = 1885

CATEGORIES = (
    "FOODS",
    "HOUSEHOLD",
    "HOBBIES",
)


def _day_number(column: str) -> int:
    if not column.startswith("d_"):
        raise ValueError(
            f"Invalid M5 day column: {column}"
        )

    return int(
        column.removeprefix("d_")
    )


def _load_store_sales(
    sales_path: Path,
    *,
    store_id: str,
) -> pd.DataFrame:
    """
    Load only rows belonging to one M5 store.

    The source M5 file is large, therefore it is read in chunks
    instead of loading every store into memory at once.
    """

    header = pd.read_csv(
        sales_path,
        nrows=0,
    )

    day_columns = [
        column
        for column in header.columns
        if column.startswith("d_")
    ]

    required_columns = [
        "item_id",
        "cat_id",
        "dept_id",
        "store_id",
        *day_columns,
    ]

    missing = [
        column
        for column in required_columns
        if column not in header.columns
    ]

    if missing:
        raise ValueError(
            "M5 sales file is missing columns: "
            + ", ".join(missing)
        )

    store_chunks: list[pd.DataFrame] = []

    for chunk in pd.read_csv(
        sales_path,
        usecols=required_columns,
        chunksize=1000,
    ):
        selected = chunk.loc[
            chunk["store_id"].eq(store_id)
        ]

        if not selected.empty:
            store_chunks.append(
                selected.copy()
            )

    if not store_chunks:
        raise ValueError(
            f"Store '{store_id}' was not found in M5 dataset."
        )

    result = pd.concat(
        store_chunks,
        ignore_index=True,
    )

    return result


def select_products(
    sales: pd.DataFrame,
    *,
    products_per_category: int,
    train_last_day: int,
) -> pd.DataFrame:
    """
    Select products using TRAIN data only.

    Ranking:
    1. number of non-zero sales days;
    2. total TRAIN quantity;
    3. item_id for deterministic tie-breaking.

    Validation and test observations are not used for selection.
    """

    if products_per_category <= 0:
        raise ValueError(
            "products_per_category must be greater than zero."
        )

    train_columns = [
        column
        for column in sales.columns
        if (
            column.startswith("d_")
            and _day_number(column)
            <= train_last_day
        )
    ]

    if not train_columns:
        raise ValueError(
            "No TRAIN day columns were found."
        )

    ranked = sales[
        [
            "item_id",
            "cat_id",
            "dept_id",
            "store_id",
        ]
    ].copy()

    train_values = sales[
        train_columns
    ]

    ranked[
        "train_nonzero_days"
    ] = train_values.gt(0).sum(
        axis=1
    )

    ranked[
        "train_total_quantity"
    ] = train_values.sum(
        axis=1
    )

    selected_frames: list[pd.DataFrame] = []

    for category in CATEGORIES:
        category_rows = ranked.loc[
            ranked["cat_id"].eq(category)
        ].copy()

        category_rows = (
            category_rows
            .sort_values(
                by=[
                    "train_nonzero_days",
                    "train_total_quantity",
                    "item_id",
                ],
                ascending=[
                    False,
                    False,
                    True,
                ],
                kind="stable",
            )
            .head(
                products_per_category
            )
        )

        if len(
            category_rows
        ) < products_per_category:
            raise ValueError(
                f"Category '{category}' contains fewer than "
                f"{products_per_category} suitable products."
            )

        selected_frames.append(
            category_rows
        )

    selected = pd.concat(
        selected_frames,
        ignore_index=True,
    )

    selected = selected.sort_values(
        by=[
            "cat_id",
            "item_id",
        ],
        kind="stable",
    ).reset_index(
        drop=True
    )

    return selected


def convert_m5_to_processed(
    sales: pd.DataFrame,
    calendar: pd.DataFrame,
    selected_products: pd.DataFrame,
) -> pd.DataFrame:
    selected_ids = set(
        selected_products[
            "item_id"
        ].astype(str)
    )

    source = sales.loc[
        sales[
            "item_id"
        ].astype(str).isin(
            selected_ids
        )
    ].copy()

    day_columns = sorted(
        [
            column
            for column in source.columns
            if column.startswith("d_")
        ],
        key=_day_number,
    )

    long_data = source.melt(
        id_vars=[
            "item_id",
            "cat_id",
            "dept_id",
            "store_id",
        ],
        value_vars=day_columns,
        var_name="d",
        value_name=TARGET_COLUMN,
    )

    calendar_mapping = calendar[
        [
            "d",
            "date",
        ]
    ].copy()

    calendar_mapping[
        "date"
    ] = pd.to_datetime(
        calendar_mapping["date"],
        errors="raise",
    ).dt.normalize()

    result = long_data.merge(
        calendar_mapping,
        on="d",
        how="left",
        validate="many_to_one",
    )

    if result[
        "date"
    ].isna().any():
        missing_days = (
            result.loc[
                result["date"].isna(),
                "d",
            ]
            .drop_duplicates()
            .tolist()
        )

        raise ValueError(
            "Calendar mapping is missing M5 days: "
            + ", ".join(
                str(day)
                for day in missing_days
            )
        )

    result = result.rename(
        columns={
            "item_id": PRODUCT_COLUMN,
            "date": DATE_COLUMN,
        }
    )

    result[
        TARGET_COLUMN
    ] = pd.to_numeric(
        result[
            TARGET_COLUMN
        ],
        errors="raise",
    ).astype(
        "int64"
    )

    result[
        IMPUTED_COLUMN
    ] = False

    processed = result[
        [
            PRODUCT_COLUMN,
            DATE_COLUMN,
            TARGET_COLUMN,
            IMPUTED_COLUMN,
        ]
    ].copy()

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


def prepare_m5_dataset(
    *,
    sales_path: Path,
    calendar_path: Path,
    output_path: Path,
    selected_products_path: Path,
    store_id: str = DEFAULT_STORE,
    products_per_category: int = DEFAULT_PRODUCTS_PER_CATEGORY,
    train_last_day: int = DEFAULT_TRAIN_LAST_DAY,
) -> None:
    if not sales_path.exists():
        raise FileNotFoundError(
            sales_path
        )

    if not calendar_path.exists():
        raise FileNotFoundError(
            calendar_path
        )

    sales = _load_store_sales(
        sales_path,
        store_id=store_id,
    )

    calendar = pd.read_csv(
        calendar_path,
        usecols=[
            "d",
            "date",
        ],
    )

    selected_products = select_products(
        sales,
        products_per_category=products_per_category,
        train_last_day=train_last_day,
    )

    processed = convert_m5_to_processed(
        sales,
        calendar,
        selected_products,
    )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    selected_products_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    processed.to_csv(
        output_path,
        index=False,
        date_format="%Y-%m-%d",
    )

    selected_products.to_csv(
        selected_products_path,
        index=False,
    )

    print(
        "M5 dataset preparation completed"
    )

    print(
        f"Store: {store_id}"
    )

    print(
        f"Products: {len(selected_products)}"
    )

    print(
        f"Rows: {len(processed)}"
    )

    print(
        "Date range: "
        f"{processed[DATE_COLUMN].min().date()} "
        "-> "
        f"{processed[DATE_COLUMN].max().date()}"
    )

    print()

    print(
        "Products by category:"
    )

    category_counts = (
        selected_products[
            "cat_id"
        ]
        .value_counts()
        .sort_index()
    )

    for category, count in category_counts.items():
        print(
            f"  {category}: {count}"
        )

    print()

    print(
        f"Processed dataset: {output_path}"
    )

    print(
        "Selected products: "
        f"{selected_products_path}"
    )


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Convert M5 Walmart sales data "
            "to Demand Forecast processed dataset."
        )
    )

    parser.add_argument(
        "sales",
        type=Path,
    )

    parser.add_argument(
        "calendar",
        type=Path,
    )

    parser.add_argument(
        "output",
        type=Path,
    )

    parser.add_argument(
        "selected_products",
        type=Path,
    )

    parser.add_argument(
        "--store",
        default=DEFAULT_STORE,
    )

    parser.add_argument(
        "--products-per-category",
        type=int,
        default=DEFAULT_PRODUCTS_PER_CATEGORY,
    )

    parser.add_argument(
        "--train-last-day",
        type=int,
        default=DEFAULT_TRAIN_LAST_DAY,
    )

    return parser


def main() -> None:
    parser = _build_parser()

    args = parser.parse_args()

    prepare_m5_dataset(
        sales_path=args.sales,
        calendar_path=args.calendar,
        output_path=args.output,
        selected_products_path=(
            args.selected_products
        ),
        store_id=args.store,
        products_per_category=(
            args.products_per_category
        ),
        train_last_day=args.train_last_day,
    )


if __name__ == "__main__":
    main()