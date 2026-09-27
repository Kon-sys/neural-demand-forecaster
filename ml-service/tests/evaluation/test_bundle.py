import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from demand_forecast_ml.api.app import create_app
from demand_forecast_ml.api.config import APISettings
from demand_forecast_ml.evaluation.bundle import package_outputs, read_bundle

ROOT = Path(__file__).resolve().parents[2]
BUNDLE = ROOT / "evaluation" / "kp24-v1.json"


def test_frozen_bundle_schema_and_alignment():
    bundle = read_bundle(BUNDLE)
    assert bundle.observations == 2100
    assert bundle.seriesCount == 300
    assert len(bundle.daily) == 7
    assert bundle.metrics[0].mae == pytest.approx(0.7158, abs=0.00005)
    assert bundle.metrics[1].mae == pytest.approx(0.6907, abs=0.00005)
    assert bundle.metrics[1].mape == pytest.approx(48.1644, abs=0.00005)


def test_packager_parses_and_preserves_metrics(tmp_path):
    (tmp_path / "test_predictions.csv").write_text(
        "product_sku,date,actual,moving_average_prediction,lstm_prediction,moving_average_absolute_error,lstm_absolute_error\n"
        "A,2024-06-26,4,3,2,1,2\nB,2024-06-26,2,3,2,1,0\n", encoding="utf-8")
    (tmp_path / "comparison_metrics.csv").write_text(
        "model,observations,mae,rmse,mape,mape_observations\n"
        "moving_average,2,1,1,37.5,2\nlstm,2,1,1.4142135623730951,25,2\n", encoding="utf-8")
    (tmp_path / "daily_metrics.csv").write_text(
        "date,moving_average_mae,lstm_mae\n2024-06-26,1,1\n", encoding="utf-8")
    bundle = package_outputs(tmp_path)
    assert bundle.daily[0].actual == 3
    assert bundle.daily[0].lstm == 2
    assert bundle.daily[0].lstmMae == 1
    assert bundle.metrics[0].mape == 37.5
    with (tmp_path / "test_predictions.csv").open("a") as stream:
        stream.write("A,2024-06-26,4,3,2,1,2\n")
    with pytest.raises(ValueError, match="Duplicate"):
        package_outputs(tmp_path)


@pytest.mark.parametrize("mutation", ["date", "nan", "model", "count"])
def test_rejects_invalid_bundle(tmp_path, mutation):
    content = json.loads(BUNDLE.read_text())
    if mutation == "date": content["daily"][0]["date"] = "2024-06-27"
    if mutation == "nan": content["daily"][0]["actual"] = float("nan")
    if mutation == "model": content["metrics"].pop()
    if mutation == "count": content["observations"] = 42
    target = tmp_path / "invalid.json"
    target.write_text(json.dumps(content))
    with pytest.raises(ValueError):
        read_bundle(target)


@pytest.mark.parametrize("state", ["valid", "missing", "invalid"])
def test_endpoint_is_read_only_and_independent_of_runtime(tmp_path, state):
    path = BUNDLE if state == "valid" else tmp_path / "bundle.json"
    if state == "invalid": path.write_text("{}")
    settings = APISettings(checkpoint_path=tmp_path / "artifacts/lstm/freshretail/missing.pt",
                           scalers_path=tmp_path / "missing.json", device="cpu", evaluation_bundle_path=path)
    app = create_app(settings=settings)
    with TestClient(app) as client:
        before = client.get("/model").json()
        response = client.get("/analytics/model-quality")
        assert response.status_code == (200 if state == "valid" else 503)
        if state == "valid": assert response.json()["seriesCount"] == 300
        else: assert response.json()["detail"]["code"] == "evaluation_unavailable"
        assert client.get("/model").json() == before
