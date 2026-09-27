from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


ML_SERVICE_ROOT = (
    Path(
        __file__
    )
    .resolve()
    .parents[3]
)

DEFAULT_ARTIFACTS_DIR = (
    ML_SERVICE_ROOT
    / "artifacts"
    / "lstm"
    / "freshretail"
)


@dataclass(frozen=True, slots=True)
class APISettings:
    checkpoint_path: Path
    scalers_path: Path
    device: str
    evaluation_bundle_path: Path = ML_SERVICE_ROOT / "evaluation" / "kp24-v1.json"

    @classmethod
    def from_environment(
        cls,
    ) -> "APISettings":
        checkpoint_path = Path(
            os.getenv(
                "ML_CHECKPOINT_PATH",
                str(
                    DEFAULT_ARTIFACTS_DIR
                    / "best_model.pt"
                ),
            )
        )

        scalers_path = Path(
            os.getenv(
                "ML_SCALERS_PATH",
                str(
                    DEFAULT_ARTIFACTS_DIR
                    / "scalers.json"
                ),
            )
        )

        device = os.getenv(
            "ML_DEVICE",
            "auto",
        )

        return cls(
            checkpoint_path=(
                checkpoint_path
            ),
            scalers_path=(
                scalers_path
            ),
            device=device,
            evaluation_bundle_path=Path(os.getenv("ML_EVALUATION_BUNDLE_PATH", str(ML_SERVICE_ROOT / "evaluation" / "kp24-v1.json"))),
        )
