from __future__ import annotations

from fastapi.testclient import (
    TestClient,
)

from demand_forecast_ml.api.app import (
    create_app,
)
from demand_forecast_ml.runtime.predictor import (
    PredictionResult,
    RuntimeHealth,
    UnknownSeriesError,
)


class FakePredictor:
    def health(
        self,
    ) -> RuntimeHealth:
        return RuntimeHealth(
            model_loaded=True,
            scalers_loaded=True,
            device="cpu",
            window_size=14,
            series_count=300,
        )

    def predict(
        self,
        *,
        product_sku: str,
        history: list[float],
    ) -> PredictionResult:
        if (
            product_sku
            == "UNKNOWN"
        ):
            raise UnknownSeriesError(
                "No scaler exists for product series 'UNKNOWN'."
            )

        return PredictionResult(
            product_sku=(
                product_sku
            ),
            prediction=2.75,
            window_size=14,
            history_points_used=14,
        )


def test_health_returns_loaded_runtime() -> None:
    application = create_app(
        runtime=FakePredictor()
    )

    with TestClient(
        application
    ) as client:
        response = client.get(
            "/health"
        )

    assert (
        response.status_code
        == 200
    )

    assert response.json() == {
        "status": "ok",
        "model_loaded": True,
        "scalers_loaded": True,
        "device": "cpu",
        "window_size": 14,
        "series_count": 300,
        "active_model_version": None,
    }


def test_predict_returns_forecast() -> None:
    application = create_app(
        runtime=FakePredictor()
    )

    with TestClient(
        application
    ) as client:
        response = client.post(
            "/predict",
            json={
                "product_sku": (
                    "STORE_1_PRODUCT_100"
                ),
                "history": [
                    1.0
                ] * 14,
                "last_observation_date": (
                    "2024-07-02"
                ),
            },
        )

    assert (
        response.status_code
        == 200
    )

    assert response.json() == {
        "product_sku": (
            "STORE_1_PRODUCT_100"
        ),
        "prediction": 2.75,
        "model": "lstm",
        "model_version": None,
        "window_size": 14,
        "history_points_used": 14,
        "forecast_date": (
            "2024-07-03"
        ),
    }


def test_predict_rejects_negative_history() -> None:
    application = create_app(
        runtime=FakePredictor()
    )

    with TestClient(
        application
    ) as client:
        response = client.post(
            "/predict",
            json={
                "product_sku": "SKU-A",
                "history": [
                    1.0,
                    -1.0,
                    2.0,
                ],
            },
        )

    assert (
        response.status_code
        == 422
    )


def test_predict_rejects_unknown_series() -> None:
    application = create_app(
        runtime=FakePredictor()
    )

    with TestClient(
        application
    ) as client:
        response = client.post(
            "/predict",
            json={
                "product_sku": (
                    "UNKNOWN"
                ),
                "history": [
                    1.0
                ] * 14,
            },
        )

    assert (
        response.status_code
        == 422
    )

    payload = (
        response.json()
    )

    assert (
        payload[
            "detail"
        ][
            "code"
        ]
        == "unknown_series"
    )