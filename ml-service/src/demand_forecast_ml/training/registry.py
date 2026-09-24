from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass(frozen=True, slots=True)
class ModelVersion:
    version: str
    directory: Path
    checkpoint_path: Path
    scalers_path: Path
    metadata_path: Path
    metrics_path: Path


class ModelRegistry:
    """
    File-system registry for trained production models.

    Every model version has its own immutable directory.

    Activation is performed separately by updating active.json.
    """

    def __init__(
        self,
        root: str | Path,
    ) -> None:
        self.root = Path(root)

        self.root.mkdir(
            parents=True,
            exist_ok=True,
        )

    @property
    def active_file(self) -> Path:
        return (
            self.root
            / "active.json"
        )

    def create_version_id(self) -> str:
        timestamp = datetime.now(
            timezone.utc
        ).strftime(
            "%Y%m%dT%H%M%SZ"
        )

        suffix = (
            uuid.uuid4()
            .hex[:8]
        )

        return (
            f"{timestamp}-{suffix}"
        )

    def version(
        self,
        version_id: str,
    ) -> ModelVersion:
        normalized = (
            str(version_id)
            .strip()
        )

        if not normalized:
            raise ValueError(
                "Model version must not be blank."
            )

        directory = (
            self.root
            / normalized
        )

        return ModelVersion(
            version=normalized,
            directory=directory,
            checkpoint_path=(
                directory
                / "best_model.pt"
            ),
            scalers_path=(
                directory
                / "scalers.json"
            ),
            metadata_path=(
                directory
                / "metadata.json"
            ),
            metrics_path=(
                directory
                / "metrics.json"
            ),
        )

    def create_version(
        self,
    ) -> ModelVersion:
        model_version = self.version(
            self.create_version_id()
        )

        model_version.directory.mkdir(
            parents=True,
            exist_ok=False,
        )

        return model_version

    def exists(
        self,
        version_id: str,
    ) -> bool:
        version = self.version(
            version_id
        )

        return (
            version.directory.exists()
            and version.checkpoint_path.exists()
            and version.scalers_path.exists()
            and version.metadata_path.exists()
            and version.metrics_path.exists()
        )

    def activate(
        self,
        version_id: str,
    ) -> None:
        if not self.exists(
            version_id
        ):
            raise FileNotFoundError(
                "Model version is incomplete or does not exist: "
                f"{version_id}"
            )

        payload = {
            "version": (
                version_id
            ),
            "activated_at": (
                datetime.now(
                    timezone.utc
                ).isoformat()
            ),
        }

        temporary_path = (
            self.root
            / "active.json.tmp"
        )

        temporary_path.write_text(
            json.dumps(
                payload,
                indent=2,
            ),
            encoding="utf-8",
        )

        temporary_path.replace(
            self.active_file
        )

    def active_version_id(
        self,
    ) -> str | None:
        if not self.active_file.exists():
            return None

        payload = json.loads(
            self.active_file.read_text(
                encoding="utf-8",
            )
        )

        version_id = payload.get(
            "version"
        )

        if not version_id:
            return None

        return str(
            version_id
        )

    def active_version(
        self,
    ) -> ModelVersion | None:
        version_id = (
            self.active_version_id()
        )

        if version_id is None:
            return None

        version = self.version(
            version_id
        )

        if not self.exists(
            version_id
        ):
            raise RuntimeError(
                "Active model points to an incomplete version: "
                f"{version_id}"
            )

        return version