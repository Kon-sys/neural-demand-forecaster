from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ColumnSpec:
    """Logical specification of a dataset column."""

    name: str
    logical_type: str
    nullable: bool
    description: str


# ---------------------------------------------------------------------------
# Column names
# ---------------------------------------------------------------------------

PRODUCT_COLUMN = "product_sku"
DATE_COLUMN = "date"
TARGET_COLUMN = "quantity"
IMPUTED_COLUMN = "is_imputed"


# ---------------------------------------------------------------------------
# Dataset columns
# ---------------------------------------------------------------------------

RAW_COLUMNS = (
    PRODUCT_COLUMN,
    DATE_COLUMN,
    TARGET_COLUMN,
)

PROCESSED_COLUMNS = (
    PRODUCT_COLUMN,
    DATE_COLUMN,
    TARGET_COLUMN,
    IMPUTED_COLUMN,
)


# ---------------------------------------------------------------------------
# Column specifications
# ---------------------------------------------------------------------------

RAW_COLUMN_SPECS = {
    PRODUCT_COLUMN: ColumnSpec(
        name=PRODUCT_COLUMN,
        logical_type="string",
        nullable=False,
        description="Stable product identifier used to separate time series.",
    ),
    DATE_COLUMN: ColumnSpec(
        name=DATE_COLUMN,
        logical_type="date",
        nullable=False,
        description="Calendar date of recorded product demand.",
    ),
    TARGET_COLUMN: ColumnSpec(
        name=TARGET_COLUMN,
        logical_type="integer",
        nullable=False,
        description="Number of product units sold on the specified date.",
    ),
}

PROCESSED_COLUMN_SPECS = {
    **RAW_COLUMN_SPECS,
    IMPUTED_COLUMN: ColumnSpec(
        name=IMPUTED_COLUMN,
        logical_type="boolean",
        nullable=False,
        description=(
            "True when the row was inserted by the preparation pipeline "
            "to restore a missing calendar date."
        ),
    ),
}


# ---------------------------------------------------------------------------
# Time-series contract
# ---------------------------------------------------------------------------

UNIQUE_KEY = (
    PRODUCT_COLUMN,
    DATE_COLUMN,
)

SERIES_ID_COLUMN = PRODUCT_COLUMN
TIME_COLUMN = DATE_COLUMN
TARGET_COLUMN_NAME = TARGET_COLUMN

TIME_FREQUENCY = "D"

MIN_QUANTITY = 0


# ---------------------------------------------------------------------------
# Dataset rules
# ---------------------------------------------------------------------------

DATASET_RULES = (
    "All required columns must exist.",
    "product_sku must not be null or blank.",
    "date must contain valid calendar dates.",
    "quantity must contain integer values.",
    "quantity must be greater than or equal to zero.",
    "The combination product_sku + date must be unique.",
    "Processed data must be ordered chronologically within each product.",
    "Processed data must contain a continuous daily calendar within each product.",
    "Missing dates inside the observed product history are restored with quantity = 0.",
    "Rows created for missing dates must have is_imputed = True.",
    "Observed rows must have is_imputed = False.",
)