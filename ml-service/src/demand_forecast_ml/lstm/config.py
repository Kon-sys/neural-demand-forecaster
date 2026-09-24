from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class LSTMConfig:
    """
    Configuration of the first LSTM forecasting model.

    The model predicts one next demand value from a fixed-size
    historical window.
    """

    window_size: int = 14

    input_size: int = 1
    hidden_size: int = 64
    num_layers: int = 2
    dropout: float = 0.2
    output_size: int = 1

    batch_size: int = 128
    learning_rate: float = 0.001

    max_epochs: int = 100
    early_stopping_patience: int = 10
    early_stopping_min_delta: float = 0.0001

    random_seed: int = 42

    def validate(self) -> None:
        if self.window_size <= 0:
            raise ValueError(
                "window_size must be greater than zero."
            )

        if self.input_size <= 0:
            raise ValueError(
                "input_size must be greater than zero."
            )

        if self.hidden_size <= 0:
            raise ValueError(
                "hidden_size must be greater than zero."
            )

        if self.num_layers <= 0:
            raise ValueError(
                "num_layers must be greater than zero."
            )

        if not 0.0 <= self.dropout < 1.0:
            raise ValueError(
                "dropout must be in the range [0, 1)."
            )

        if self.output_size <= 0:
            raise ValueError(
                "output_size must be greater than zero."
            )

        if self.batch_size <= 0:
            raise ValueError(
                "batch_size must be greater than zero."
            )

        if self.learning_rate <= 0:
            raise ValueError(
                "learning_rate must be greater than zero."
            )

        if self.max_epochs <= 0:
            raise ValueError(
                "max_epochs must be greater than zero."
            )

        if self.early_stopping_patience <= 0:
            raise ValueError(
                "early_stopping_patience must be greater than zero."
            )

        if self.early_stopping_min_delta < 0:
            raise ValueError(
                "early_stopping_min_delta must be greater than "
                "or equal to zero."
            )


DEFAULT_LSTM_CONFIG = LSTMConfig()