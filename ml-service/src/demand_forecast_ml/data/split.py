from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from .contract import DATE_COLUMN
from .validate import validate_processed_dataframe


class DatasetSplitError(ValueError):
    """Raised when chronological dataset splitting cannot be performed."""


@dataclass(frozen=True, slots=True)
class DatasetSplits:
    """Chronological train, validation and test partitions."""

    train: pd.DataFrame
    validation: pd.DataFrame
    test: pd.DataFrame
    train_end: pd.Timestamp
    validation_end: pd.Timestamp


def _parse_cutoff(
    value: str | pd.Timestamp,
    name: str,
) -> pd.Timestamp:
    try:
        timestamp = pd.Timestamp(value)
    except (TypeError, ValueError) as exc:
        raise DatasetSplitError(
            f"Invalid {name}: {value!r}."
        ) from exc

    if pd.isna(timestamp):
        raise DatasetSplitError(
            f"Invalid {name}: {value!r}."
        )

    return timestamp.normalize()


def split_by_date(
    dataframe: pd.DataFrame,
    *,
    train_end: str | pd.Timestamp,
    validation_end: str | pd.Timestamp,
) -> DatasetSplits:
    """
    Split a processed dataset chronologically using explicit date cutoffs.

    Rules:
        train:
            date <= train_end

        validation:
            train_end < date <= validation_end

        test:
            date > validation_end

    No rows are shuffled.

    Exact cutoff dates are intentionally supplied by the caller instead
    of being hard-coded into the ML data layer.
    """

    validate_processed_dataframe(dataframe)

    train_cutoff = _parse_cutoff(
        train_end,
        "train_end",
    )

    validation_cutoff = _parse_cutoff(
        validation_end,
        "validation_end",
    )

    if train_cutoff >= validation_cutoff:
        raise DatasetSplitError(
            "train_end must be earlier than validation_end."
        )

    dates = pd.to_datetime(
        dataframe[DATE_COLUMN],
        errors="raise",
    ).dt.normalize()

    train_mask = dates <= train_cutoff

    validation_mask = (
        (dates > train_cutoff)
        & (dates <= validation_cutoff)
    )

    test_mask = dates > validation_cutoff

    train = dataframe.loc[train_mask].copy()
    validation = dataframe.loc[validation_mask].copy()
    test = dataframe.loc[test_mask].copy()

    empty_partitions: list[str] = []

    if train.empty:
        empty_partitions.append("train")

    if validation.empty:
        empty_partitions.append("validation")

    if test.empty:
        empty_partitions.append("test")

    if empty_partitions:
        raise DatasetSplitError(
            "Chronological split produced empty partition(s): "
            + ", ".join(empty_partitions)
            + "."
        )

    return DatasetSplits(
        train=train.reset_index(drop=True),
        validation=validation.reset_index(drop=True),
        test=test.reset_index(drop=True),
        train_end=train_cutoff,
        validation_end=validation_cutoff,
    )