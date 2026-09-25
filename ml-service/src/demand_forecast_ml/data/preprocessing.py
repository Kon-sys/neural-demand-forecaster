from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from .contract import (
    DATE_COLUMN,
    PRODUCT_COLUMN,
    PROCESSED_COLUMNS,
    TARGET_COLUMN,
)
from .split import split_by_date
from .validate import validate_processed_dataframe


SCALED_TARGET_COLUMN = "quantity_scaled"


@dataclass(frozen=True, slots=True)
class MinMaxScaler1D:
    """
    One-dimensional Min-Max scaler.

    The scaler is deliberately fitted only on the training partition.
    Validation and test data must never influence scaling parameters.
    """

    min_value: float
    max_value: float

    @classmethod
    def fit(
        cls,
        values: pd.Series,
    ) -> "MinMaxScaler1D":
        numeric = pd.to_numeric(
            values,
            errors="raise",
        ).astype(float)

        if numeric.empty:
            raise ValueError(
                "Cannot fit scaler on an empty series."
            )

        return cls(
            min_value=float(numeric.min()),
            max_value=float(numeric.max()),
        )

    @property
    def span(self) -> float:
        return self.max_value - self.min_value

    def transform_value(
        self,
        value: float,
    ) -> float:
        if self.span == 0:
            return 0.0

        return (
            float(value) - self.min_value
        ) / self.span

    def inverse_transform_value(
        self,
        value: float,
    ) -> float:
        if self.span == 0:
            return self.min_value

        return (
            float(value) * self.span
            + self.min_value
        )

    def transform_series(
        self,
        values: pd.Series,
    ) -> pd.Series:
        numeric = pd.to_numeric(
            values,
            errors="raise",
        ).astype(float)

        if self.span == 0:
            return pd.Series(
                0.0,
                index=values.index,
                dtype="float64",
            )

        return (
            numeric - self.min_value
        ) / self.span

    def inverse_transform_series(
        self,
        values: pd.Series,
    ) -> pd.Series:
        numeric = pd.to_numeric(
            values,
            errors="raise",
        ).astype(float)

        if self.span == 0:
            return pd.Series(
                self.min_value,
                index=values.index,
                dtype="float64",
            )

        return (
            numeric * self.span
            + self.min_value
        )

    def save(
        self,
        path: str | Path,
    ) -> None:
        output_path = Path(path)

        output_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        payload = {
            "type": "min_max_1d",
            "min_value": self.min_value,
            "max_value": self.max_value,
        }

        output_path.write_text(
            json.dumps(
                payload,
                indent=2,
            ),
            encoding="utf-8",
        )

    @classmethod
    def load(
        cls,
        path: str | Path,
    ) -> "MinMaxScaler1D":
        payload = json.loads(
            Path(path).read_text(
                encoding="utf-8",
            )
        )

        if payload.get("type") != "min_max_1d":
            raise ValueError(
                "Unsupported scaler artifact."
            )

        return cls(
            min_value=float(
                payload["min_value"]
            ),
            max_value=float(
                payload["max_value"]
            ),
        )


@dataclass(frozen=True, slots=True)
class ScaledPartitions:
    train: pd.DataFrame
    validation: pd.DataFrame
    test: pd.DataFrame

    scaler: MinMaxScaler1D

    train_end: pd.Timestamp
    validation_end: pd.Timestamp


@dataclass(frozen=True, slots=True)
class WindowSample:
    product_sku: str
    target_date: pd.Timestamp
    inputs: tuple[float, ...]
    target: float


@dataclass(frozen=True, slots=True)
class ModelWindows:
    train: tuple[WindowSample, ...]
    validation: tuple[WindowSample, ...]
    test: tuple[WindowSample, ...]


def _add_scaled_quantity(
    dataframe: pd.DataFrame,
    scaler: MinMaxScaler1D,
) -> pd.DataFrame:
    result = dataframe.copy()

    result[SCALED_TARGET_COLUMN] = (
        scaler.transform_series(
            result[TARGET_COLUMN]
        )
    )

    return result


def prepare_scaled_partitions(
    dataframe: pd.DataFrame,
    *,
    train_end: str | pd.Timestamp,
    validation_end: str | pd.Timestamp,
) -> ScaledPartitions:
    """
    Split a processed dataset chronologically and normalize quantity.

    Scaling parameters are fitted strictly on TRAIN.

    Validation and TEST are transformed using the same TRAIN scaler.
    """

    validate_processed_dataframe(
        dataframe
    )

    splits = split_by_date(
        dataframe,
        train_end=train_end,
        validation_end=validation_end,
    )

    scaler = MinMaxScaler1D.fit(
        splits.train[TARGET_COLUMN]
    )

    return ScaledPartitions(
        train=_add_scaled_quantity(
            splits.train,
            scaler,
        ),
        validation=_add_scaled_quantity(
            splits.validation,
            scaler,
        ),
        test=_add_scaled_quantity(
            splits.test,
            scaler,
        ),
        scaler=scaler,
        train_end=splits.train_end,
        validation_end=splits.validation_end,
    )


def build_windows(
    dataframe: pd.DataFrame,
    *,
    window_size: int,
    value_column: str = SCALED_TARGET_COLUMN,
    target_start: str | pd.Timestamp | None = None,
    target_end: str | pd.Timestamp | None = None,
) -> tuple[WindowSample, ...]:
    """
    Convert continuous product time series into supervised samples.

    Example for window_size = 3:

        [y1, y2, y3] -> y4
        [y2, y3, y4] -> y5

    Inputs always contain observations strictly preceding the target date.
    """

    if window_size <= 0:
        raise ValueError(
            "window_size must be greater than zero."
        )

    if value_column not in dataframe.columns:
        raise ValueError(
            f"Column '{value_column}' does not exist."
        )

    base_dataframe = dataframe.loc[
        :,
        list(PROCESSED_COLUMNS),
    ].copy()

    validate_processed_dataframe(
        base_dataframe
    )

    prepared = dataframe.copy()

    prepared[DATE_COLUMN] = pd.to_datetime(
        prepared[DATE_COLUMN],
        errors="raise",
    ).dt.normalize()

    prepared = prepared.sort_values(
        by=[
            PRODUCT_COLUMN,
            DATE_COLUMN,
        ],
        kind="stable",
    ).reset_index(drop=True)

    start = (
        pd.Timestamp(target_start).normalize()
        if target_start is not None
        else None
    )

    end = (
        pd.Timestamp(target_end).normalize()
        if target_end is not None
        else None
    )

    samples: list[WindowSample] = []

    for product_sku, product_data in prepared.groupby(
        PRODUCT_COLUMN,
        sort=True,
    ):
        product_data = (
            product_data
            .sort_values(
                DATE_COLUMN,
                kind="stable",
            )
            .reset_index(drop=True)
        )

        values = pd.to_numeric(
            product_data[value_column],
            errors="raise",
        ).astype(float)

        for target_index in range(
            window_size,
            len(product_data),
        ):
            target_date = product_data.loc[
                target_index,
                DATE_COLUMN,
            ]

            if (
                start is not None
                and target_date < start
            ):
                continue

            if (
                end is not None
                and target_date > end
            ):
                continue

            input_values = tuple(
                float(value)
                for value in values.iloc[
                    target_index
                    - window_size:
                    target_index
                ]
            )

            target = float(
                values.iloc[target_index]
            )

            samples.append(
                WindowSample(
                    product_sku=str(
                        product_sku
                    ),
                    target_date=target_date,
                    inputs=input_values,
                    target=target,
                )
            )

    return tuple(samples)


def build_partition_windows(
    partitions: ScaledPartitions,
    *,
    window_size: int,
) -> ModelWindows:
    """
    Build supervised windows for TRAIN, VALIDATION and TEST.

    The full chronological history is used only to provide past context.
    The target observation determines the partition to which a sample belongs.
    """

    full_history = pd.concat(
        [
            partitions.train,
            partitions.validation,
            partitions.test,
        ],
        ignore_index=True,
    )

    full_history = full_history.sort_values(
        by=[
            PRODUCT_COLUMN,
            DATE_COLUMN,
        ],
        kind="stable",
    ).reset_index(drop=True)

    validation_start = (
        partitions.train_end
        + pd.Timedelta(days=1)
    )

    test_start = (
        partitions.validation_end
        + pd.Timedelta(days=1)
    )

    train_windows = build_windows(
        full_history,
        window_size=window_size,
        target_end=partitions.train_end,
    )

    validation_windows = build_windows(
        full_history,
        window_size=window_size,
        target_start=validation_start,
        target_end=partitions.validation_end,
    )

    test_windows = build_windows(
        full_history,
        window_size=window_size,
        target_start=test_start,
    )

    return ModelWindows(
        train=train_windows,
        validation=validation_windows,
        test=test_windows,
    )