from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path

import torch

from demand_forecast_ml.lstm.config import LSTMConfig
from demand_forecast_ml.lstm.model import DemandLSTM


CHECKPOINT_FORMAT_VERSION = 1


@dataclass(frozen=True, slots=True)
class LoadedCheckpoint:
    model: DemandLSTM
    config: LSTMConfig
    epoch: int
    validation_loss: float


def save_checkpoint(
    *,
    model: DemandLSTM,
    config: LSTMConfig,
    epoch: int,
    validation_loss: float,
    path: str | Path,
) -> None:
    output_path = Path(path)

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    payload = {
        "format_version": CHECKPOINT_FORMAT_VERSION,
        "config": asdict(config),
        "epoch": int(epoch),
        "validation_loss": float(validation_loss),
        "state_dict": model.state_dict(),
    }

    torch.save(
        payload,
        output_path,
    )


def load_checkpoint(
    path: str | Path,
    *,
    device: torch.device,
) -> LoadedCheckpoint:
    checkpoint_path = Path(path)

    if not checkpoint_path.exists():
        raise FileNotFoundError(
            f"Checkpoint does not exist: {checkpoint_path}"
        )

    payload = torch.load(
        checkpoint_path,
        map_location=device,
        weights_only=True,
    )

    if (
        payload.get("format_version")
        != CHECKPOINT_FORMAT_VERSION
    ):
        raise ValueError(
            "Unsupported LSTM checkpoint format."
        )

    config_payload = payload.get(
        "config"
    )

    if not isinstance(
        config_payload,
        dict,
    ):
        raise ValueError(
            "Checkpoint does not contain valid model config."
        )

    config = LSTMConfig(
        **config_payload
    )

    config.validate()

    model = DemandLSTM(
        config
    )

    model.load_state_dict(
        payload[
            "state_dict"
        ]
    )

    model.to(
        device
    )

    model.eval()

    return LoadedCheckpoint(
        model=model,
        config=config,
        epoch=int(
            payload["epoch"]
        ),
        validation_loss=float(
            payload[
                "validation_loss"
            ]
        ),
    )