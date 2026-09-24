from __future__ import annotations

import torch
from torch import Tensor, nn

from demand_forecast_ml.lstm.config import (
    LSTMConfig,
)


class DemandLSTM(
    nn.Module
):
    """
    Compact univariate global LSTM for demand forecasting.

    Input:
        [batch, sequence_length, input_size]

    Output:
        [batch, 1]
    """

    def __init__(
        self,
        config: LSTMConfig,
    ) -> None:
        super().__init__()

        config.validate()

        recurrent_dropout = (
            config.dropout
            if config.num_layers > 1
            else 0.0
        )

        self.lstm = nn.LSTM(
            input_size=(
                config.input_size
            ),
            hidden_size=(
                config.hidden_size
            ),
            num_layers=(
                config.num_layers
            ),
            batch_first=True,
            dropout=(
                recurrent_dropout
            ),
        )

        self.output_layer = nn.Linear(
            config.hidden_size,
            config.output_size,
        )

    def forward(
        self,
        inputs: Tensor,
    ) -> Tensor:
        if inputs.ndim != 3:
            raise ValueError(
                "LSTM input must have shape "
                "[batch, sequence_length, features]."
            )

        sequence_output, _ = self.lstm(
            inputs
        )

        last_hidden = sequence_output[
            :,
            -1,
            :,
        ]

        prediction = (
            self.output_layer(
                last_hidden
            )
        )

        return prediction


def count_trainable_parameters(
    model: nn.Module,
) -> int:
    return sum(
        parameter.numel()
        for parameter in model.parameters()
        if parameter.requires_grad
    )


def set_torch_seed(
    seed: int,
) -> None:
    torch.manual_seed(
        seed
    )

    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(
            seed
        )