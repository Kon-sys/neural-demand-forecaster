"""Package existing frozen KP-24 outputs; no inference or model mutation."""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Metric(StrictModel):
    model: Literal["moving_average", "lstm"]
    mae: float = Field(ge=0)
    rmse: float = Field(ge=0)
    mape: float | None = Field(ge=0)
    observations: int = Field(gt=0)
    mapeObservations: int = Field(ge=0)


class Daily(StrictModel):
    date: date
    actual: float = Field(ge=0)
    movingAverage: float = Field(ge=0)
    lstm: float = Field(ge=0)
    movingAverageMae: float = Field(ge=0)
    lstmMae: float = Field(ge=0)


class EvaluationBundle(StrictModel):
    schemaVersion: Literal[1] = 1
    source: Literal["KP-24 frozen FreshRetail TEST"] = "KP-24 frozen FreshRetail TEST"
    protocol: Literal["rolling one-step-ahead"] = "rolling one-step-ahead"
    testStart: date
    testEnd: date
    observations: int = Field(gt=0)
    seriesCount: int = Field(gt=0)
    metrics: list[Metric]
    daily: list[Daily]
    sourceHashes: dict[str, str]

    @model_validator(mode="after")
    def aligned(self) -> EvaluationBundle:
        dates = [point.date for point in self.daily]
        expected = [self.testStart + timedelta(days=i) for i in range((self.testEnd - self.testStart).days + 1)]
        if not expected or dates != expected or self.observations != self.seriesCount * len(dates):
            raise ValueError("Incomplete or unaligned TEST series")
        if len(self.metrics) != 2 or {m.model for m in self.metrics} != {"moving_average", "lstm"}:
            raise ValueError("Both frozen models are required")
        if any(m.observations != self.observations or m.mapeObservations > self.observations for m in self.metrics):
            raise ValueError("Metric observation counts do not match")
        return self


def read_bundle(path: Path) -> EvaluationBundle:
    return EvaluationBundle.model_validate_json(path.read_text(encoding="utf-8"))


def package_outputs(directory: Path) -> EvaluationBundle:
    def read(name: str) -> list[dict[str, str]]:
        with (directory / name).open(encoding="utf-8", newline="") as stream:
            return list(csv.DictReader(stream))

    predictions = read("test_predictions.csv")
    metrics = read("comparison_metrics.csv")
    daily_metrics = read("daily_metrics.csv")
    if not predictions:
        raise ValueError("Empty TEST predictions")
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    keys: set[tuple[str, str]] = set()
    skus: set[str] = set()
    for row in predictions:
        key = row["product_sku"], row["date"]
        if key in keys:
            raise ValueError("Duplicate TEST observation")
        keys.add(key)
        skus.add(key[0])
        for model in ("moving_average", "lstm"):
            actual, predicted, error = float(row["actual"]), float(row[f"{model}_prediction"]), float(row[f"{model}_absolute_error"])
            if not all(math.isfinite(v) and v >= 0 for v in (actual, predicted, error)):
                raise ValueError("Invalid TEST value")
            if not math.isclose(abs(actual - predicted), error, abs_tol=1e-9):
                raise ValueError("Misaligned absolute error")
        grouped[row["date"]].append(row)
    errors = {row["date"]: row for row in daily_metrics}
    if len(errors) != len(daily_metrics) or set(errors) != set(grouped):
        raise ValueError("Daily metric dates differ from predictions")
    daily = []
    for day, rows in sorted(grouped.items()):
        if {r["product_sku"] for r in rows} != skus:
            raise ValueError("Missing experimental series on TEST date")
        mean = lambda column: sum(float(r[column]) for r in rows) / len(rows)
        for model in ("moving_average", "lstm"):
            if not math.isclose(mean(f"{model}_absolute_error"), float(errors[day][f"{model}_mae"]), abs_tol=1e-9):
                raise ValueError("Daily MAE does not match predictions")
        daily.append(Daily(date=day, actual=mean("actual"), movingAverage=mean("moving_average_prediction"),
                           lstm=mean("lstm_prediction"), movingAverageMae=float(errors[day]["moving_average_mae"]),
                           lstmMae=float(errors[day]["lstm_mae"])))
    mapped_metrics = [Metric(model=r["model"], mae=float(r["mae"]), rmse=float(r["rmse"]),
                            mape=float(r["mape"]) if r["mape"] else None, observations=int(r["observations"]),
                            mapeObservations=int(r["mape_observations"])) for r in metrics]
    return EvaluationBundle(testStart=daily[0].date, testEnd=daily[-1].date, observations=len(predictions),
                            seriesCount=len(skus), metrics=mapped_metrics, daily=daily,
                            sourceHashes={name: hashlib.sha256((directory / name).read_bytes()).hexdigest()
                                          for name in ("test_predictions.csv", "comparison_metrics.csv", "daily_metrics.csv")})


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifacts", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    bundle = package_outputs(args.artifacts)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(bundle.model_dump_json(indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
