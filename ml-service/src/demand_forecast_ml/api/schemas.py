from __future__ import annotations

import math
from datetime import date
from typing import Any

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


class PredictRequest(
    BaseModel
):
    model_config = ConfigDict(
        extra="forbid"
    )

    product_sku: str = Field(
        min_length=1,
        max_length=255,
    )

    history: list[
        float
    ] = Field(
        min_length=1,
    )

    last_observation_date: (
        date
        | None
    ) = None

    @field_validator(
        "product_sku"
    )
    @classmethod
    def validate_product_sku(
        cls,
        value: str,
    ) -> str:
        normalized = (
            value.strip()
        )

        if not normalized:
            raise ValueError(
                "product_sku must not be blank."
            )

        return normalized

    @field_validator(
        "history"
    )
    @classmethod
    def validate_history(
        cls,
        values: list[
            float
        ],
    ) -> list[
        float
    ]:
        for value in values:
            if not math.isfinite(
                value
            ):
                raise ValueError(
                    "history must contain finite values only."
                )

            if value < 0:
                raise ValueError(
                    "history must contain non-negative values only."
                )

        return values


class PredictResponse(
    BaseModel
):
    model_config = ConfigDict(
        extra="forbid"
    )

    product_sku: str
    prediction: float

    model: str = "lstm"

    model_version: (
        str
        | None
    ) = None

    window_size: int
    history_points_used: int

    forecast_date: (
        date
        | None
    )


class HealthResponse(
    BaseModel
):
    model_config = ConfigDict(
        extra="forbid"
    )

    status: str

    model_loaded: bool
    scalers_loaded: bool

    device: (
        str
        | None
    )

    window_size: (
        int
        | None
    )

    series_count: (
        int
        | None
    )

    active_model_version: (
        str
        | None
    ) = None


class TrainingStartResponse(
    BaseModel
):
    job_id: str
    status: str
    created_at: str


class TrainingJobResponse(
    BaseModel
):
    job_id: str
    status: str

    created_at: str

    started_at: (
        str
        | None
    )

    finished_at: (
        str
        | None
    )

    version: (
        str
        | None
    )

    error: (
        str
        | None
    )

    result: (
        dict[
            str,
            Any,
        ]
        | None
    )


class ModelInfoResponse(
    BaseModel
):
    active_version: (
        str
        | None
    )

    source: str

    metadata: (
        dict[
            str,
            Any,
        ]
        | None
    )

    metrics: (
        dict[
            str,
            Any,
        ]
        | None
    )


class ModelActivationResponse(
    BaseModel
):
    version: str
    status: str