from __future__ import annotations

from fastapi import (
    FastAPI,
    Request,
)
from fastapi.responses import (
    JSONResponse,
)

from demand_forecast_ml.api.dependencies import (
    RuntimeUnavailableError,
    TrainingUnavailableError,
)

from demand_forecast_ml.runtime.predictor import (
    InvalidHistoryError,
    PredictionRuntimeError,
    UnknownSeriesError,
)


def _error_payload(
    *,
    code: str,
    message: str,
) -> dict[
    str,
    object,
]:
    return {
        "detail": {
            "code": code,
            "message": message,
        }
    }


def register_exception_handlers(
    app: FastAPI,
) -> None:
    @app.exception_handler(
        UnknownSeriesError
    )
    async def handle_unknown_series(
        request: Request,
        exc: UnknownSeriesError,
    ) -> JSONResponse:
        del request

        return JSONResponse(
            status_code=422,
            content=_error_payload(
                code="unknown_series",
                message=str(
                    exc
                ),
            ),
        )

    @app.exception_handler(
        InvalidHistoryError
    )
    async def handle_invalid_history(
        request: Request,
        exc: InvalidHistoryError,
    ) -> JSONResponse:
        del request

        return JSONResponse(
            status_code=422,
            content=_error_payload(
                code="invalid_history",
                message=str(
                    exc
                ),
            ),
        )

    @app.exception_handler(
        RuntimeUnavailableError
    )
    async def handle_runtime_unavailable(
        request: Request,
        exc: RuntimeUnavailableError,
    ) -> JSONResponse:
        del request

        return JSONResponse(
            status_code=503,
            content=_error_payload(
                code="runtime_unavailable",
                message=str(
                    exc
                ),
            ),
        )

    @app.exception_handler(
        PredictionRuntimeError
    )
    async def handle_prediction_runtime_error(
        request: Request,
        exc: PredictionRuntimeError,
    ) -> JSONResponse:
        del request

        return JSONResponse(
            status_code=500,
            content=_error_payload(
                code="prediction_error",
                message=str(
                    exc
                ),
            ),
        )

    @app.exception_handler(
        TrainingUnavailableError
    )
    async def handle_training_unavailable(
        request: Request,
        exc: TrainingUnavailableError,
    ) -> JSONResponse:
        del request

        return JSONResponse(
            status_code=503,
            content=_error_payload(
                code="training_unavailable",
                message=str(
                    exc
                ),
            ),
        )