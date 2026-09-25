from __future__ import annotations

import time

from fastapi.testclient import (
    TestClient,
)

from demand_forecast_ml.api.app import (
    create_app,
)
from demand_forecast_ml.runtime.manager import (
    RuntimeManager,
)
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
    assert (
        dataset_path.exists()
    )

    model_version.checkpoint_path.write_bytes(
        b"checkpoint"
    )

    model_version.scalers_path.write_text(
        "{}",
        encoding="utf-8",
    )

    model_version.metadata_path.write_text(
        (
            '{"status":"ready",'
            '"source":"test"}'
        ),
        encoding="utf-8",
    )

    model_version.metrics_path.write_text(
        '{"mae":1.0}',
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


def _wait_for_job(
    client: TestClient,
    job_id: str,
) -> dict:
    for _ in range(
        100
    ):
        response = client.get(
            f"/training/{job_id}"
        )

        assert (
            response.status_code
            == 200
        )

        payload = (
            response.json()
        )

        if payload[
            "status"
        ] in {
            "ready",
            "failed",
        }:
            return payload

        time.sleep(
            0.01
        )

    raise AssertionError(
        "Training job did not finish."
    )


def test_training_upload_creates_ready_version(
    tmp_path,
) -> None:
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

    manager = RuntimeManager(
        registry=registry,
    )

    application = create_app(
        registry=registry,
        runtime_manager=manager,
        training_service=service,
    )

    try:
        with TestClient(
            application
        ) as client:
            response = client.post(
                "/training/start",
                files={
                    "file": (
                        "sales.csv",
                        (
                            "product_sku,date,quantity\n"
                            "SKU-A,2026-01-01,1\n"
                        ),
                        "text/csv",
                    )
                },
            )

            assert (
                response.status_code
                == 202
            )

            payload = (
                response.json()
            )

            job = _wait_for_job(
                client,
                payload[
                    "job_id"
                ],
            )

            assert (
                job[
                    "status"
                ]
                == "ready"
            )

            assert (
                job[
                    "version"
                ]
                is not None
            )

            # READY must not mean ACTIVE.
            assert (
                registry
                .active_version_id()
                is None
            )

    finally:
        service.shutdown()


def test_training_endpoint_rejects_non_csv(
    tmp_path,
) -> None:
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

    manager = RuntimeManager(
        registry=registry,
    )

    application = create_app(
        registry=registry,
        runtime_manager=manager,
        training_service=service,
    )

    try:
        with TestClient(
            application
        ) as client:
            response = client.post(
                "/training/start",
                files={
                    "file": (
                        "sales.txt",
                        b"invalid",
                        "text/plain",
                    )
                },
            )

        assert (
            response.status_code
            == 415
        )

    finally:
        service.shutdown()