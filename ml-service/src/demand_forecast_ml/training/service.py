from __future__ import annotations

import shutil
import threading
import uuid
from concurrent.futures import (
    ThreadPoolExecutor,
)
from dataclasses import (
    asdict,
    dataclass,
)
from datetime import (
    datetime,
    timezone,
)
from pathlib import Path
from typing import Callable

from demand_forecast_ml.training.pipeline import (
    ProductionTrainingResult,
    train_production_model,
)
from demand_forecast_ml.training.registry import (
    ModelRegistry,
    ModelVersion,
)


TrainingFunction = Callable[
    ...,
    ProductionTrainingResult,
]


@dataclass(slots=True)
class TrainingJob:
    job_id: str
    status: str

    created_at: str
    started_at: str | None = None
    finished_at: str | None = None

    version: str | None = None

    error: str | None = None

    result: dict[
        str,
        object,
    ] | None = None


class TrainingService:
    """
    Single-worker asynchronous production training queue.

    Jobs are intentionally serialized so multiple administrator actions
    cannot train several CPU-heavy LSTM models simultaneously.
    """

    def __init__(
        self,
        *,
        registry: ModelRegistry,
        work_dir: str | Path,
        training_function: TrainingFunction = (
            train_production_model
        ),
    ) -> None:
        self._registry = registry

        self._work_dir = Path(
            work_dir
        )

        self._work_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        self._training_function = (
            training_function
        )

        self._executor = (
            ThreadPoolExecutor(
                max_workers=1,
                thread_name_prefix=(
                    "ml-training"
                ),
            )
        )

        self._lock = (
            threading.RLock()
        )

        self._jobs: dict[
            str,
            TrainingJob,
        ] = {}

    def start(
        self,
        *,
        dataset_path: str | Path,
    ) -> TrainingJob:
        source_path = Path(
            dataset_path
        )

        if not source_path.exists():
            raise FileNotFoundError(
                f"Training dataset does not exist: {source_path}"
            )

        job_id = (
            uuid.uuid4()
            .hex
        )

        job_directory = (
            self._work_dir
            / job_id
        )

        job_directory.mkdir(
            parents=True,
            exist_ok=False,
        )

        copied_dataset = (
            job_directory
            / "training.csv"
        )

        shutil.copyfile(
            source_path,
            copied_dataset,
        )

        job = TrainingJob(
            job_id=job_id,
            status="queued",
            created_at=(
                datetime.now(
                    timezone.utc
                ).isoformat()
            ),
        )

        with self._lock:
            self._jobs[
                job_id
            ] = job

        self._executor.submit(
            self._run,
            job_id,
            copied_dataset,
        )

        return self.get(
            job_id
        )

    def _run(
        self,
        job_id: str,
        dataset_path: Path,
    ) -> None:
        with self._lock:
            job = self._jobs[
                job_id
            ]

            job.status = (
                "training"
            )

            job.started_at = (
                datetime.now(
                    timezone.utc
                ).isoformat()
            )

        model_version: (
            ModelVersion
            | None
        ) = None

        try:
            model_version = (
                self._registry
                .create_version()
            )

            result = (
                self._training_function(
                    dataset_path=(
                        dataset_path
                    ),
                    model_version=(
                        model_version
                    ),
                )
            )

            with self._lock:
                job = self._jobs[
                    job_id
                ]

                job.status = "ready"

                job.version = (
                    model_version
                    .version
                )

                job.result = asdict(
                    result
                )

        except Exception as exc:
            with self._lock:
                job = self._jobs[
                    job_id
                ]

                job.status = "failed"

                job.error = (
                    f"{type(exc).__name__}: {exc}"
                )

            if (
                model_version
                is not None
                and model_version
                .directory
                .exists()
            ):
                shutil.rmtree(
                    model_version
                    .directory,
                    ignore_errors=True,
                )

        finally:
            with self._lock:
                self._jobs[
                    job_id
                ].finished_at = (
                    datetime.now(
                        timezone.utc
                    ).isoformat()
                )

    def get(
        self,
        job_id: str,
    ) -> TrainingJob:
        with self._lock:
            try:
                job = self._jobs[
                    job_id
                ]
            except KeyError as exc:
                raise KeyError(
                    f"Training job does not exist: {job_id}"
                ) from exc

            return TrainingJob(
                job_id=job.job_id,
                status=job.status,
                created_at=(
                    job.created_at
                ),
                started_at=(
                    job.started_at
                ),
                finished_at=(
                    job.finished_at
                ),
                version=(
                    job.version
                ),
                error=job.error,
                result=(
                    None
                    if job.result is None
                    else dict(
                        job.result
                    )
                ),
            )

    def shutdown(
        self,
    ) -> None:
        self._executor.shutdown(
            wait=False,
            cancel_futures=False,
        )