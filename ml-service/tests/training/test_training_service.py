from __future__ import annotations

import time

from demand_forecast_ml.training.pipeline import (
    ProductionTrainingResult,
)
from demand_forecast_ml.training.registry import (
    ModelRegistry,
)
from demand_forecast_ml.training.service import (
    TrainingService,
)


def _fake_training(
    *,
    dataset_path,
    model_version,
):
    assert dataset_path.exists()

    model_version.checkpoint_path.write_bytes(
        b"checkpoint"
    )

    model_version.scalers_path.write_text(
        "{}",
        encoding="utf-8",
    )

    model_version.metadata_path.write_text(
        "{}",
        encoding="utf-8",
    )

    model_version.metrics_path.write_text(
        "{}",
        encoding="utf-8",
    )

    return ProductionTrainingResult(
        version=(
            model_version.version
        ),
        rows=100,
        series_count=5,
        train_end="2026-08-17",
        validation_start="2026-08-18",
        validation_end="2026-08-31",
        train_samples=50,
        validation_samples=20,
        best_epoch=3,
        epochs_completed=5,
        mae=1.0,
        rmse=1.2,
        mape=10.0,
        mape_observations=20,
    )


def _wait_until_finished(
    service: TrainingService,
    job_id: str,
):
    for _ in range(
        100
    ):
        job = service.get(
            job_id
        )

        if job.status in {
            "ready",
            "failed",
        }:
            return job

        time.sleep(
            0.01
        )

    raise AssertionError(
        "Training job did not finish."
    )


def test_training_job_becomes_ready(
    tmp_path,
) -> None:
    dataset = (
        tmp_path
        / "dataset.csv"
    )

    dataset.write_text(
        (
            "product_sku,date,quantity\n"
            "SKU-A,2026-01-01,1\n"
        ),
        encoding="utf-8",
    )

    registry = ModelRegistry(
        tmp_path
        / "models"
    )

    service = TrainingService(
        registry=registry,
        work_dir=(
            tmp_path
            / "jobs"
        ),
        training_function=(
            _fake_training
        ),
    )

    try:
        job = service.start(
            dataset_path=dataset
        )

        finished = (
            _wait_until_finished(
                service,
                job.job_id,
            )
        )

        assert (
            finished.status
            == "ready"
        )

        assert (
            finished.version
            is not None
        )

        assert (
            finished.result
            is not None
        )

        assert (
            finished.result[
                "mae"
            ]
            == 1.0
        )

        assert registry.exists(
            finished.version
        )

        # Training does not activate automatically.
        assert (
            registry.active_version_id()
            is None
        )

    finally:
        service.shutdown()