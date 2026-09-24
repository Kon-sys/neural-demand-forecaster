from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from demand_forecast_ml.data.contract import (
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from demand_forecast_ml.data.preprocessing import (
    MinMaxScaler1D,
    SCALED_TARGET_COLUMN,
)
from demand_forecast_ml.data.split import (
    DatasetSplits,
    split_by_date,
)
from demand_forecast_ml.data.validate import (
    validate_processed_dataframe,
)


@dataclass(frozen=True, slots=True)
class SeriesScalerRegistry:
    """
    Per-series Min-Max scalers.

    Every scaler is fitted strictly on the TRAIN observations
    of its own product series.
    """

    scalers: dict[str, MinMaxScaler1D]

    @classmethod
    def fit(
        cls,
        train: pd.DataFrame,
    ) -> "SeriesScalerRegistry":
        validate_processed_dataframe(
            train
        )

        scalers: dict[
            str,
            MinMaxScaler1D,
        ] = {}

        for product_sku, group in train.groupby(
            PRODUCT_COLUMN,
            sort=True,
        ):
            scaler = MinMaxScaler1D.fit(
                group[
                    TARGET_COLUMN
                ]
            )

            scalers[
                str(product_sku)
            ] = scaler

        if not scalers:
            raise ValueError(
                "Cannot fit series scalers on an empty dataset."
            )

        return cls(
            scalers=scalers
        )

    def get(
        self,
        product_sku: str,
    ) -> MinMaxScaler1D:
        try:
            return self.scalers[
                str(product_sku)
            ]
        except KeyError as exc:
            raise KeyError(
                "Scaler is missing for product series "
                f"'{product_sku}'."
            ) from exc

    def transform(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        validate_processed_dataframe(
            dataframe
        )

        transformed = (
            dataframe.copy()
        )

        transformed[
            SCALED_TARGET_COLUMN
        ] = 0.0

        for product_sku, indexes in transformed.groupby(
            PRODUCT_COLUMN,
            sort=False,
        ).groups.items():
            scaler = self.get(
                str(product_sku)
            )

            transformed.loc[
                indexes,
                SCALED_TARGET_COLUMN,
            ] = scaler.transform_series(
                transformed.loc[
                    indexes,
                    TARGET_COLUMN,
                ]
            ).to_numpy()

        transformed[
            SCALED_TARGET_COLUMN
        ] = (
            transformed[
                SCALED_TARGET_COLUMN
            ]
            .astype(
                "float64"
            )
        )

        return transformed

    def inverse_transform_value(
        self,
        product_sku: str,
        value: float,
    ) -> float:
        return self.get(
            product_sku
        ).inverse_transform_value(
            value
        )

    def save(
        self,
        path: str | Path,
    ) -> None:
        output_path = Path(
            path
        )

        output_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        payload = {
            "type": "per_series_min_max",
            "series": {
                product_sku: {
                    "min_value": (
                        scaler.min_value
                    ),
                    "max_value": (
                        scaler.max_value
                    ),
                }
                for (
                    product_sku,
                    scaler,
                ) in sorted(
                    self.scalers.items()
                )
            },
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
    ) -> "SeriesScalerRegistry":
        payload = json.loads(
            Path(
                path
            ).read_text(
                encoding="utf-8",
            )
        )

        if (
            payload.get("type")
            != "per_series_min_max"
        ):
            raise ValueError(
                "Unsupported scaler registry artifact."
            )

        series_payload = payload.get(
            "series"
        )

        if not isinstance(
            series_payload,
            dict,
        ) or not series_payload:
            raise ValueError(
                "Scaler registry does not contain series."
            )

        scalers = {
            str(product_sku): (
                MinMaxScaler1D(
                    min_value=float(
                        values[
                            "min_value"
                        ]
                    ),
                    max_value=float(
                        values[
                            "max_value"
                        ]
                    ),
                )
            )
            for (
                product_sku,
                values,
            ) in series_payload.items()
        }

        return cls(
            scalers=scalers
        )


@dataclass(frozen=True, slots=True)
class LSTMScaledPartitions:
    train: pd.DataFrame
    validation: pd.DataFrame
    test: pd.DataFrame

    scalers: SeriesScalerRegistry

    train_end: pd.Timestamp
    validation_end: pd.Timestamp


def prepare_lstm_partitions(
    dataframe: pd.DataFrame,
    *,
    train_end: str | pd.Timestamp,
    validation_end: str | pd.Timestamp,
) -> LSTMScaledPartitions:
    """
    Prepare chronologically split data for LSTM.

    Scaling parameters are fitted independently for every series
    and strictly on TRAIN.

    VALIDATION and TEST never influence scaler parameters.
    """

    validate_processed_dataframe(
        dataframe
    )

    splits: DatasetSplits = (
        split_by_date(
            dataframe,
            train_end=train_end,
            validation_end=validation_end,
        )
    )

    registry = (
        SeriesScalerRegistry.fit(
            splits.train
        )
    )

    train = registry.transform(
        splits.train
    )

    validation = (
        registry.transform(
            splits.validation
        )
    )

    test = registry.transform(
        splits.test
    )

    return LSTMScaledPartitions(
        train=train,
        validation=validation,
        test=test,
        scalers=registry,
        train_end=splits.train_end,
        validation_end=(
            splits.validation_end
        ),
    )