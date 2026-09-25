from __future__ import annotations

from dataclasses import dataclass

import pandas as pd
import torch
from torch import Tensor
from torch.utils.data import Dataset

from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from demand_forecast_ml.data.preprocessing import (
    SCALED_TARGET_COLUMN,
    WindowSample,
    build_windows,
)
from demand_forecast_ml.lstm.scaling import (
    LSTMScaledPartitions,
)


@dataclass(frozen=True, slots=True)
class LSTMSampleMetadata:
    product_sku: str
    target_date: pd.Timestamp
    actual: float


class LSTMWindowDataset(
    Dataset[
        tuple[
            Tensor,
            Tensor,
        ]
    ]
):
    """
    PyTorch dataset for one-step-ahead LSTM forecasting.

    Inputs and training targets use scaled values.

    Exact original-scale target values are kept separately in metadata
    so evaluation never reconstructs ground truth from float32 tensors.

    x shape:
        [window_size, 1]

    y shape:
        [1]
    """

    def __init__(
        self,
        samples: tuple[
            WindowSample,
            ...,
        ],
        actual_targets: tuple[
            float,
            ...,
        ],
    ) -> None:
        if not samples:
            raise ValueError(
                "LSTM dataset must contain at least one sample."
            )

        if len(samples) != len(actual_targets):
            raise ValueError(
                "Scaled samples and original targets must have equal length."
            )

        self._samples = samples
        self._actual_targets = actual_targets

    def __len__(
        self,
    ) -> int:
        return len(
            self._samples
        )

    def __getitem__(
        self,
        index: int,
    ) -> tuple[
        Tensor,
        Tensor,
    ]:
        sample = self._samples[
            index
        ]

        inputs = torch.tensor(
            sample.inputs,
            dtype=torch.float32,
        ).unsqueeze(
            -1
        )

        target = torch.tensor(
            [
                sample.target,
            ],
            dtype=torch.float32,
        )

        return (
            inputs,
            target,
        )

    def metadata(
        self,
        index: int,
    ) -> LSTMSampleMetadata:
        sample = self._samples[
            index
        ]

        return LSTMSampleMetadata(
            product_sku=(
                sample.product_sku
            ),
            target_date=(
                sample.target_date
            ),
            actual=float(
                self._actual_targets[
                    index
                ]
            ),
        )


@dataclass(frozen=True, slots=True)
class LSTMDatasets:
    train: LSTMWindowDataset
    validation: LSTMWindowDataset


def _build_dataset(
    *,
    scaled_samples: tuple[
        WindowSample,
        ...,
    ],
    original_samples: tuple[
        WindowSample,
        ...,
    ],
) -> LSTMWindowDataset:
    if len(
        scaled_samples
    ) != len(
        original_samples
    ):
        raise ValueError(
            "Scaled and original window collections "
            "must have equal length."
        )

    actual_targets: list[
        float
    ] = []

    for (
        scaled_sample,
        original_sample,
    ) in zip(
        scaled_samples,
        original_samples,
        strict=True,
    ):
        if (
            scaled_sample.product_sku
            != original_sample.product_sku
        ):
            raise ValueError(
                "Scaled and original samples contain "
                "different product identifiers."
            )

        if (
            scaled_sample.target_date
            != original_sample.target_date
        ):
            raise ValueError(
                "Scaled and original samples contain "
                "different target dates."
            )

        actual_targets.append(
            float(
                original_sample.target
            )
        )

    return LSTMWindowDataset(
        samples=scaled_samples,
        actual_targets=tuple(
            actual_targets
        ),
    )


def build_lstm_datasets(
    partitions: LSTMScaledPartitions,
    *,
    window_size: int,
) -> LSTMDatasets:
    """
    Build TRAIN and VALIDATION datasets.

    TEST is intentionally not exposed here.

    Validation windows may use preceding TRAIN observations and
    preceding validation observations as historical context, but
    never the current or a future target value.

    Network inputs and targets use scaled quantity.

    Exact original quantity values are retained only as evaluation
    metadata and never enter model inputs.
    """

    if window_size <= 0:
        raise ValueError(
            "window_size must be greater than zero."
        )

    history = pd.concat(
        [
            partitions.train,
            partitions.validation,
        ],
        ignore_index=True,
    )

    history = history.sort_values(
        by=[
            PRODUCT_COLUMN,
            DATE_COLUMN,
        ],
        kind="stable",
    ).reset_index(
        drop=True
    )

    validation_start = (
        partitions.train_end
        + pd.Timedelta(
            days=1
        )
    )

    train_scaled_samples = (
        build_windows(
            history,
            window_size=(
                window_size
            ),
            value_column=(
                SCALED_TARGET_COLUMN
            ),
            target_end=(
                partitions.train_end
            ),
        )
    )

    train_original_samples = (
        build_windows(
            history,
            window_size=(
                window_size
            ),
            value_column=(
                TARGET_COLUMN
            ),
            target_end=(
                partitions.train_end
            ),
        )
    )

    validation_scaled_samples = (
        build_windows(
            history,
            window_size=(
                window_size
            ),
            value_column=(
                SCALED_TARGET_COLUMN
            ),
            target_start=(
                validation_start
            ),
            target_end=(
                partitions.validation_end
            ),
        )
    )

    validation_original_samples = (
        build_windows(
            history,
            window_size=(
                window_size
            ),
            value_column=(
                TARGET_COLUMN
            ),
            target_start=(
                validation_start
            ),
            target_end=(
                partitions.validation_end
            ),
        )
    )

    return LSTMDatasets(
        train=_build_dataset(
            scaled_samples=(
                train_scaled_samples
            ),
            original_samples=(
                train_original_samples
            ),
        ),
        validation=_build_dataset(
            scaled_samples=(
                validation_scaled_samples
            ),
            original_samples=(
                validation_original_samples
            ),
        ),
    )