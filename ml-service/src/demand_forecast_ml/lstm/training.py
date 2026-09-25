from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import torch
from torch import nn
from torch.optim import Adam
from torch.utils.data import DataLoader

from demand_forecast_ml.lstm.checkpoint import (
    save_checkpoint,
)
from demand_forecast_ml.lstm.config import (
    LSTMConfig,
)
from demand_forecast_ml.lstm.dataset import (
    LSTMDatasets,
)
from demand_forecast_ml.lstm.model import (
    DemandLSTM,
    set_torch_seed,
)


@dataclass(frozen=True, slots=True)
class EpochRecord:
    epoch: int
    train_loss: float
    validation_loss: float


@dataclass(frozen=True, slots=True)
class TrainingResult:
    best_epoch: int
    best_validation_loss: float
    epochs_completed: int
    stopped_early: bool
    history: tuple[EpochRecord, ...]
    checkpoint_path: Path


def resolve_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device(
            "cuda"
        )

    return torch.device(
        "cpu"
    )


def build_data_loaders(
    datasets: LSTMDatasets,
    *,
    config: LSTMConfig,
) -> tuple[
    DataLoader,
    DataLoader,
]:
    generator = (
        torch.Generator()
        .manual_seed(
            config.random_seed
        )
    )

    train_loader = DataLoader(
        datasets.train,
        batch_size=(
            config.batch_size
        ),
        shuffle=True,
        num_workers=0,
        generator=generator,
    )

    validation_loader = DataLoader(
        datasets.validation,
        batch_size=(
            config.batch_size
        ),
        shuffle=False,
        num_workers=0,
    )

    return (
        train_loader,
        validation_loader,
    )


def _run_training_epoch(
    *,
    model: DemandLSTM,
    loader: DataLoader,
    loss_function: nn.Module,
    optimizer: Adam,
    device: torch.device,
) -> float:
    model.train()

    loss_sum = 0.0
    observations = 0

    for inputs, targets in loader:
        inputs = inputs.to(
            device
        )

        targets = targets.to(
            device
        )

        optimizer.zero_grad(
            set_to_none=True
        )

        predictions = model(
            inputs
        )

        loss = loss_function(
            predictions,
            targets,
        )

        loss.backward()

        torch.nn.utils.clip_grad_norm_(
            model.parameters(),
            max_norm=1.0,
        )

        optimizer.step()

        batch_size = (
            inputs.shape[0]
        )

        loss_sum += (
            float(
                loss.detach().cpu()
            )
            * batch_size
        )

        observations += (
            batch_size
        )

    if observations == 0:
        raise ValueError(
            "Training loader is empty."
        )

    return (
        loss_sum
        / observations
    )


def _run_validation_epoch(
    *,
    model: DemandLSTM,
    loader: DataLoader,
    loss_function: nn.Module,
    device: torch.device,
) -> float:
    model.eval()

    loss_sum = 0.0
    observations = 0

    with torch.no_grad():
        for inputs, targets in loader:
            inputs = inputs.to(
                device
            )

            targets = targets.to(
                device
            )

            predictions = model(
                inputs
            )

            loss = loss_function(
                predictions,
                targets,
            )

            batch_size = (
                inputs.shape[0]
            )

            loss_sum += (
                float(
                    loss.detach().cpu()
                )
                * batch_size
            )

            observations += (
                batch_size
            )

    if observations == 0:
        raise ValueError(
            "Validation loader is empty."
        )

    return (
        loss_sum
        / observations
    )


def train_lstm(
    *,
    datasets: LSTMDatasets,
    config: LSTMConfig,
    checkpoint_path: str | Path,
    device: torch.device | None = None,
    verbose: bool = True,
) -> TrainingResult:
    config.validate()

    set_torch_seed(
        config.random_seed
    )

    training_device = (
        device
        if device is not None
        else resolve_device()
    )

    model = DemandLSTM(
        config
    ).to(
        training_device
    )

    loss_function = nn.MSELoss()

    optimizer = Adam(
        model.parameters(),
        lr=config.learning_rate,
    )

    (
        train_loader,
        validation_loader,
    ) = build_data_loaders(
        datasets,
        config=config,
    )

    best_validation_loss = (
        float("inf")
    )

    best_epoch = 0

    epochs_without_improvement = 0

    history: list[
        EpochRecord
    ] = []

    output_path = Path(
        checkpoint_path
    )

    stopped_early = False

    for epoch in range(
        1,
        config.max_epochs + 1,
    ):
        train_loss = (
            _run_training_epoch(
                model=model,
                loader=train_loader,
                loss_function=(
                    loss_function
                ),
                optimizer=optimizer,
                device=training_device,
            )
        )

        validation_loss = (
            _run_validation_epoch(
                model=model,
                loader=(
                    validation_loader
                ),
                loss_function=(
                    loss_function
                ),
                device=training_device,
            )
        )

        history.append(
            EpochRecord(
                epoch=epoch,
                train_loss=(
                    train_loss
                ),
                validation_loss=(
                    validation_loss
                ),
            )
        )

        improved = (
            validation_loss
            < (
                best_validation_loss
                - config.early_stopping_min_delta
            )
        )

        if improved:
            best_validation_loss = (
                validation_loss
            )

            best_epoch = epoch

            epochs_without_improvement = 0

            save_checkpoint(
                model=model,
                config=config,
                epoch=epoch,
                validation_loss=(
                    validation_loss
                ),
                path=output_path,
            )
        else:
            epochs_without_improvement += 1

        if verbose:
            print(
                f"Epoch {epoch:03d} | "
                f"train={train_loss:.6f} | "
                f"validation={validation_loss:.6f}"
            )

        if (
            epochs_without_improvement
            >= config.early_stopping_patience
        ):
            stopped_early = True

            if verbose:
                print(
                    "Early stopping: "
                    f"no improvement for "
                    f"{config.early_stopping_patience} epochs."
                )

            break

    if best_epoch == 0:
        raise RuntimeError(
            "Training did not produce a valid checkpoint."
        )

    return TrainingResult(
        best_epoch=best_epoch,
        best_validation_loss=(
            best_validation_loss
        ),
        epochs_completed=len(
            history
        ),
        stopped_early=(
            stopped_early
        ),
        history=tuple(
            history
        ),
        checkpoint_path=(
            output_path
        ),
    )