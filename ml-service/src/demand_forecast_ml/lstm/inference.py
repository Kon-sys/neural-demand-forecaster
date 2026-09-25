from __future__ import annotations

import pandas as pd
import torch
from torch.utils.data import DataLoader

from demand_forecast_ml.data.contract import (
    DATE_COLUMN,
    PRODUCT_COLUMN,
)
from demand_forecast_ml.lstm.dataset import (
    LSTMWindowDataset,
)
from demand_forecast_ml.lstm.model import (
    DemandLSTM,
)
from demand_forecast_ml.lstm.scaling import (
    SeriesScalerRegistry,
)


PREDICTION_COLUMNS = (
    PRODUCT_COLUMN,
    DATE_COLUMN,
    "actual",
    "prediction",
    "actual_scaled",
    "prediction_scaled",
)


def predict_dataset(
    *,
    model: DemandLSTM,
    dataset: LSTMWindowDataset,
    scalers: SeriesScalerRegistry,
    device: torch.device,
    batch_size: int = 512,
) -> pd.DataFrame:
    """
    Predict a prepared LSTM dataset.

    Predictions are inverse-transformed from normalized model output.

    Ground-truth values are taken directly from the original float64
    dataset metadata rather than reconstructed from float32 tensors.
    This preserves exact zero demand values for evaluation metrics.
    """

    if batch_size <= 0:
        raise ValueError(
            "batch_size must be greater than zero."
        )

    loader = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=0,
    )

    model.eval()

    records: list[
        dict[str, object]
    ] = []

    dataset_index = 0

    with torch.no_grad():
        for inputs, targets in loader:
            inputs = inputs.to(
                device
            )

            predictions = (
                model(
                    inputs
                )
                .detach()
                .cpu()
                .reshape(
                    -1
                )
            )

            targets = (
                targets
                .detach()
                .cpu()
                .reshape(
                    -1
                )
            )

            for (
                prediction_scaled,
                actual_scaled,
            ) in zip(
                predictions.tolist(),
                targets.tolist(),
                strict=True,
            ):
                metadata = (
                    dataset.metadata(
                        dataset_index
                    )
                )

                scaler = scalers.get(
                    metadata.product_sku
                )

                prediction = (
                    scaler
                    .inverse_transform_value(
                        prediction_scaled
                    )
                )

                # Demand cannot be negative.
                prediction = max(
                    0.0,
                    prediction,
                )

                records.append(
                    {
                        PRODUCT_COLUMN: (
                            metadata.product_sku
                        ),
                        DATE_COLUMN: (
                            metadata.target_date
                        ),
                        "actual": (
                            metadata.actual
                        ),
                        "prediction": (
                            float(
                                prediction
                            )
                        ),
                        "actual_scaled": (
                            float(
                                actual_scaled
                            )
                        ),
                        "prediction_scaled": (
                            float(
                                prediction_scaled
                            )
                        ),
                    }
                )

                dataset_index += 1

    if dataset_index != len(
        dataset
    ):
        raise RuntimeError(
            "Prediction count does not match dataset size."
        )

    return pd.DataFrame(
        records,
        columns=list(
            PREDICTION_COLUMNS
        ),
    )