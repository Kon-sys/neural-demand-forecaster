from __future__ import annotations

import io
import time

import pandas as pd
import torch
from fastapi.testclient import TestClient

from demand_forecast_ml.api.app import create_app
from demand_forecast_ml.lstm.config import LSTMConfig
from demand_forecast_ml.runtime.manager import RuntimeManager
from demand_forecast_ml.training.pipeline import train_production_model
from demand_forecast_ml.training.registry import ModelRegistry
from demand_forecast_ml.training.service import TrainingService


def _training_csv_bytes() -> bytes:
    dates = pd.date_range(
        "2026-01-01",
        periods=40,
        freq="D",
    )

    rows: list[dict[str, object]] = []

    for product_sku, multiplier in (
        ("SKU-A", 1.0),
        ("SKU-B", 2.0),
    ):
        for index, date in enumerate(dates):
            rows.append(
                {
                    "product_sku": product_sku,
                    "date": date.strftime("%Y-%m-%d"),
                    "quantity": (
                        multiplier
                        * (
                            5.0
                            + float(index % 7)
                        )
                    ),
                }
            )

    buffer = io.StringIO()

    pd.DataFrame(
        rows
    ).to_csv(
        buffer,
        index=False,
    )

    return buffer.getvalue().encode(
        "utf-8"
    )


def _fast_real_training(
    *,
    dataset_path,
    model_version,
):
    config = LSTMConfig(
        window_size=14,
        input_size=1,
        hidden_size=8,
        num_layers=1,
        dropout=0.0,
        output_size=1,
        batch_size=16,
        learning_rate=0.001,
        max_epochs=2,
        early_stopping_patience=2,
        early_stopping_min_delta=0.0001,
        random_seed=42,
    )

    return train_production_model(
        dataset_path=dataset_path,
        model_version=model_version,
        config=config,
        validation_days=14,
        device=torch.device(
            "cpu"
        ),
    )


def _wait_for_training(
    client: TestClient,
    job_id: str,
) -> dict:
    for _ in range(200):
        response = client.get(
            f"/training/{job_id}"
        )

        assert (
            response.status_code
            == 200
        )

        payload = response.json()

        if payload["status"] in {
            "ready",
            "failed",
        }:
            return payload

        time.sleep(
            0.02
        )

    raise AssertionError(
        "Training did not finish in time."
    )


def test_real_http_training_activation_and_prediction(
    tmp_path,
) -> None:
    registry = ModelRegistry(
        tmp_path
        / "models"
    )

    manager = RuntimeManager(
        registry=registry,
        requested_device="cpu",
    )

    service = TrainingService(
        registry=registry,
        work_dir=(
            tmp_path
            / "jobs"
        ),
        training_function=(
            _fast_real_training
        ),
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
            # No active model yet.
            response = client.get(
                "/health"
            )

            assert (
                response.status_code
                == 503
            )

            # Upload accumulated sales history.
            response = client.post(
                "/training/start",
                files={
                    "file": (
                        "sales.csv",
                        _training_csv_bytes(),
                        "text/csv",
                    )
                },
            )

            assert (
                response.status_code
                == 202
            )

            job_id = (
                response.json()[
                    "job_id"
                ]
            )

            job = _wait_for_training(
                client,
                job_id,
            )

            assert (
                job["status"]
                == "ready"
            )

            assert (
                job["version"]
                is not None
            )

            version = job[
                "version"
            ]

            # READY model is still not active.
            assert (
                registry.active_version_id()
                is None
            )

            # Activate model through HTTP.
            response = client.post(
                f"/models/{version}/activate"
            )

            assert (
                response.status_code
                == 200
            )

            assert response.json() == {
                "version": version,
                "status": "active",
            }

            assert (
                registry.active_version_id()
                == version
            )

            # Health immediately sees hot-reloaded model.
            response = client.get(
                "/health"
            )

            assert (
                response.status_code
                == 200
            )

            health = response.json()

            assert (
                health[
                    "status"
                ]
                == "ok"
            )

            assert (
                health[
                    "model_loaded"
                ]
                is True
            )

            assert (
                health[
                    "scalers_loaded"
                ]
                is True
            )

            assert (
                health[
                    "active_model_version"
                ]
                == version
            )

            # Model metadata is available.
            response = client.get(
                "/model"
            )

            assert (
                response.status_code
                == 200
            )

            model_info = (
                response.json()
            )

            assert (
                model_info[
                    "active_version"
                ]
                == version
            )

            assert (
                model_info[
                    "source"
                ]
                == "production_registry"
            )

            assert (
                model_info[
                    "metadata"
                ][
                    "status"
                ]
                == "ready"
            )

            assert (
                model_info[
                    "metrics"
                ][
                    "mae"
                ]
                >= 0.0
            )

            history = [
                5.0
                + float(
                    index % 7
                )
                for index in range(
                    26,
                    40,
                )
            ]

            # Real prediction through HTTP.
            response = client.post(
                "/predict",
                json={
                    "product_sku": (
                        "SKU-A"
                    ),
                    "history": history,
                    "last_observation_date": (
                        "2026-02-09"
                    ),
                },
            )

            assert (
                response.status_code
                == 200
            )

            prediction = (
                response.json()
            )

            assert (
                prediction[
                    "product_sku"
                ]
                == "SKU-A"
            )

            assert (
                prediction[
                    "model"
                ]
                == "lstm"
            )

            assert (
                prediction[
                    "model_version"
                ]
                == version
            )

            assert (
                prediction[
                    "window_size"
                ]
                == 14
            )

            assert (
                prediction[
                    "history_points_used"
                ]
                == 14
            )

            assert (
                prediction[
                    "prediction"
                ]
                >= 0.0
            )

            assert (
                prediction[
                    "forecast_date"
                ]
                == "2026-02-10"
            )

    finally:
        service.shutdown()