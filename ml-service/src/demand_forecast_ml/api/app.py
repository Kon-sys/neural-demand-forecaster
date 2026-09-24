from __future__ import annotations

import json
import shutil
import uuid
from contextlib import asynccontextmanager
from datetime import timedelta
from pathlib import Path
from typing import AsyncIterator

from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.responses import (
    JSONResponse,
)

from demand_forecast_ml.api.config import (
    APISettings,
)
from demand_forecast_ml.api.dependencies import (
    PredictorProtocol,
    get_predictor,
    get_runtime_manager,
    get_training_service,
)
from demand_forecast_ml.api.errors import (
    register_exception_handlers,
)
from demand_forecast_ml.api.schemas import (
    HealthResponse,
    ModelActivationResponse,
    ModelInfoResponse,
    PredictRequest,
    PredictResponse,
    TrainingJobResponse,
    TrainingStartResponse,
)
from demand_forecast_ml.runtime.manager import (
    RuntimeManager,
)
from demand_forecast_ml.runtime.predictor import (
    PredictionRuntime,
)
from demand_forecast_ml.training.registry import (
    ModelRegistry,
)
from demand_forecast_ml.training.service import (
    TrainingJob,
    TrainingService,
)


def _training_job_response(
    job: TrainingJob,
) -> TrainingJobResponse:
    return TrainingJobResponse(
        job_id=job.job_id,
        status=job.status,
        created_at=job.created_at,
        started_at=job.started_at,
        finished_at=job.finished_at,
        version=job.version,
        error=job.error,
        result=job.result,
    )


def _read_json_file(
    path: Path,
) -> dict[str, object] | None:
    if not path.exists():
        return None

    return json.loads(
        path.read_text(
            encoding="utf-8",
        )
    )


def create_app(
    *,
    settings: APISettings | None = None,
    runtime: PredictorProtocol | None = None,
    runtime_manager: RuntimeManager | None = None,
    training_service: TrainingService | None = None,
    registry: ModelRegistry | None = None,
) -> FastAPI:
    resolved_settings = (
        settings
        if settings is not None
        else APISettings.from_environment()
    )

    service_root = (
        resolved_settings
        .checkpoint_path
        .resolve()
        .parents[3]
    )

    resolved_registry = (
        registry
        if registry is not None
        else ModelRegistry(
            service_root
            / "models"
        )
    )

    incoming_dir = (
        service_root
        / "training-data"
    )

    incoming_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    @asynccontextmanager
    async def lifespan(
        application: FastAPI,
    ) -> AsyncIterator[
        None
    ]:
        application.state.startup_error = None

        manager = runtime_manager

        if manager is None:
            bootstrap_runtime = None

            if runtime is not None:
                bootstrap_runtime = runtime

            else:
                try:
                    bootstrap_runtime = (
                        PredictionRuntime.load(
                            checkpoint_path=(
                                resolved_settings
                                .checkpoint_path
                            ),
                            scalers_path=(
                                resolved_settings
                                .scalers_path
                            ),
                            requested_device=(
                                resolved_settings
                                .device
                            ),
                        )
                    )

                except Exception as exc:
                    application.state.startup_error = (
                        f"{type(exc).__name__}: {exc}"
                    )

            manager = RuntimeManager(
                registry=(
                    resolved_registry
                ),
                runtime=(
                    bootstrap_runtime
                ),
                requested_device=(
                    resolved_settings
                    .device
                ),
            )

            # A production model takes precedence over the bootstrap
            # FreshRetail model whenever one has already been activated.
            try:
                manager.load_active()
            except Exception as exc:
                application.state.startup_error = (
                    f"{type(exc).__name__}: {exc}"
                )

        application.state.runtime_manager = (
            manager
        )

        service = training_service

        if service is None:
            service = TrainingService(
                registry=(
                    resolved_registry
                ),
                work_dir=(
                    service_root
                    / "training-jobs"
                ),
            )

        application.state.training_service = (
            service
        )

        yield

        if training_service is None:
            service.shutdown()

        application.state.training_service = None
        application.state.runtime_manager = None

    application = FastAPI(
        title="Demand Forecast ML Service",
        version="1.0.0",
        description=(
            "Inference, retraining and model lifecycle service "
            "for demand forecasting."
        ),
        lifespan=lifespan,
    )

    register_exception_handlers(
        application
    )

    @application.get(
        "/health",
        response_model=HealthResponse,
    )
    async def health() -> (
        HealthResponse
        | JSONResponse
    ):
        manager = getattr(
            application.state,
            "runtime_manager",
            None,
        )

        if manager is None:
            response = HealthResponse(
                status="unhealthy",
                model_loaded=False,
                scalers_loaded=False,
                device=None,
                window_size=None,
                series_count=None,
                active_model_version=None,
            )

            return JSONResponse(
                status_code=503,
                content=response.model_dump(
                    mode="json"
                ),
            )

        predictor = (
            manager.get_runtime()
        )

        if predictor is None:
            response = HealthResponse(
                status="unhealthy",
                model_loaded=False,
                scalers_loaded=False,
                device=None,
                window_size=None,
                series_count=None,
                active_model_version=None,
            )

            return JSONResponse(
                status_code=503,
                content=response.model_dump(
                    mode="json"
                ),
            )

        runtime_health = (
            predictor.health()
        )

        model_info = (
            manager.active_model_info()
        )

        return HealthResponse(
            status="ok",
            model_loaded=(
                runtime_health
                .model_loaded
            ),
            scalers_loaded=(
                runtime_health
                .scalers_loaded
            ),
            device=(
                runtime_health
                .device
            ),
            window_size=(
                runtime_health
                .window_size
            ),
            series_count=(
                runtime_health
                .series_count
            ),
            active_model_version=(
                model_info.version
            ),
        )

    @application.post(
        "/predict",
        response_model=PredictResponse,
    )
    async def predict(
        request: PredictRequest,
        predictor: PredictorProtocol = Depends(
            get_predictor
        ),
        manager: RuntimeManager = Depends(
            get_runtime_manager
        ),
    ) -> PredictResponse:
        result = predictor.predict(
            product_sku=(
                request.product_sku
            ),
            history=request.history,
        )

        forecast_date = None

        if (
            request.last_observation_date
            is not None
        ):
            forecast_date = (
                request.last_observation_date
                + timedelta(
                    days=1
                )
            )

        model_info = (
            manager.active_model_info()
        )

        return PredictResponse(
            product_sku=(
                result.product_sku
            ),
            prediction=(
                result.prediction
            ),
            model="lstm",
            model_version=(
                model_info.version
            ),
            window_size=(
                result.window_size
            ),
            history_points_used=(
                result.history_points_used
            ),
            forecast_date=(
                forecast_date
            ),
        )

    @application.post(
        "/training/start",
        response_model=(
            TrainingStartResponse
        ),
        status_code=202,
    )
    async def start_training(
        file: UploadFile = File(
            ...
        ),
        service: TrainingService = Depends(
            get_training_service
        ),
    ) -> TrainingStartResponse:
        filename = (
            file.filename
            or ""
        )

        if not filename.lower().endswith(
            ".csv"
        ):
            raise HTTPException(
                status_code=415,
                detail={
                    "code": (
                        "unsupported_training_file"
                    ),
                    "message": (
                        "Training data must be a CSV file."
                    ),
                },
            )

        upload_id = (
            uuid.uuid4()
            .hex
        )

        upload_path = (
            incoming_dir
            / f"{upload_id}.csv"
        )

        try:
            with upload_path.open(
                "wb"
            ) as destination:
                shutil.copyfileobj(
                    file.file,
                    destination,
                )

            if (
                upload_path.stat()
                .st_size
                == 0
            ):
                raise HTTPException(
                    status_code=422,
                    detail={
                        "code": (
                            "empty_training_file"
                        ),
                        "message": (
                            "Training CSV must not be empty."
                        ),
                    },
                )

            job = service.start(
                dataset_path=(
                    upload_path
                )
            )

        finally:
            await file.close()

            upload_path.unlink(
                missing_ok=True
            )

        return TrainingStartResponse(
            job_id=(
                job.job_id
            ),
            status=(
                job.status
            ),
            created_at=(
                job.created_at
            ),
        )

    @application.get(
        "/training/{job_id}",
        response_model=(
            TrainingJobResponse
        ),
    )
    async def get_training_job(
        job_id: str,
        service: TrainingService = Depends(
            get_training_service
        ),
    ) -> TrainingJobResponse:
        try:
            job = service.get(
                job_id
            )

        except KeyError as exc:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": (
                        "training_job_not_found"
                    ),
                    "message": str(
                        exc
                    ),
                },
            ) from exc

        return _training_job_response(
            job
        )

    @application.get(
        "/model",
        response_model=(
            ModelInfoResponse
        ),
    )
    async def get_model(
        manager: RuntimeManager = Depends(
            get_runtime_manager
        ),
    ) -> ModelInfoResponse:
        info = (
            manager.active_model_info()
        )

        if info.version is None:
            return ModelInfoResponse(
                active_version=None,
                source=info.source,
                metadata=None,
                metrics=None,
            )

        version = (
            manager.registry
            .version(
                info.version
            )
        )

        return ModelInfoResponse(
            active_version=(
                info.version
            ),
            source=info.source,
            metadata=_read_json_file(
                version.metadata_path
            ),
            metrics=_read_json_file(
                version.metrics_path
            ),
        )

    @application.post(
        "/models/{version_id}/activate",
        response_model=(
            ModelActivationResponse
        ),
    )
    async def activate_model(
        version_id: str,
        manager: RuntimeManager = Depends(
            get_runtime_manager
        ),
    ) -> ModelActivationResponse:
        try:
            info = manager.activate(
                version_id
            )

        except FileNotFoundError as exc:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": (
                        "model_version_not_found"
                    ),
                    "message": str(
                        exc
                    ),
                },
            ) from exc

        return ModelActivationResponse(
            version=(
                info.version
                or version_id
            ),
            status="active",
        )

    return application


app = create_app()