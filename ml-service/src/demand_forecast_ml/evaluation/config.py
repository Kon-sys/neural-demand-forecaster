from __future__ import annotations


TRAIN_END = "2024-06-11"
VALIDATION_END = "2024-06-25"
TEST_START = "2024-06-26"

MOVING_AVERAGE_WINDOWS = (
    3,
    7,
    14,
    30,
)

BASELINE_SELECTION_METRIC = "mae"