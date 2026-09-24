from __future__ import annotations

import pandas as pd

from .contract import (
    DATE_COLUMN,
    PRODUCT_COLUMN,
    TARGET_COLUMN,
)
from .validate import validate_processed_dataframe


ANOMALY_COLUMNS = (
    PRODUCT_COLUMN,
    DATE_COLUMN,
    TARGET_COLUMN,
    "lower_bound",
    "upper_bound",
    "direction",
)


def detect_quantity_anomalies(
    dataframe: pd.DataFrame,
    *,
    iqr_multiplier: float = 1.5,
) -> pd.DataFrame:
    """
    Detect statistical demand anomalies independently for each product.

    Statistical anomalies are reported but are not automatically removed
    or replaced.

    Negative quantities and structurally invalid values are handled earlier
    by the dataset validator.
    """

    if iqr_multiplier <= 0:
        raise ValueError(
            "iqr_multiplier must be greater than zero."
        )

    validate_processed_dataframe(
        dataframe
    )

    anomalies: list[dict[str, object]] = []

    for product_sku, group in dataframe.groupby(
        PRODUCT_COLUMN,
        sort=True,
    ):
        quantities = group[
            TARGET_COLUMN
        ].astype(float)

        first_quartile = float(
            quantities.quantile(0.25)
        )

        third_quartile = float(
            quantities.quantile(0.75)
        )

        iqr = (
            third_quartile
            - first_quartile
        )

        lower_bound = max(
            0.0,
            first_quartile
            - iqr_multiplier * iqr,
        )

        upper_bound = (
            third_quartile
            + iqr_multiplier * iqr
        )

        anomaly_mask = (
            quantities.lt(lower_bound)
            | quantities.gt(upper_bound)
        )

        for index in group.index[
            anomaly_mask
        ]:
            quantity = float(
                dataframe.loc[
                    index,
                    TARGET_COLUMN,
                ]
            )

            direction = (
                "LOW"
                if quantity < lower_bound
                else "HIGH"
            )

            anomalies.append(
                {
                    PRODUCT_COLUMN: (
                        str(product_sku)
                    ),
                    DATE_COLUMN: (
                        dataframe.loc[
                            index,
                            DATE_COLUMN,
                        ]
                    ),
                    TARGET_COLUMN: (
                        dataframe.loc[
                            index,
                            TARGET_COLUMN,
                        ]
                    ),
                    "lower_bound": (
                        lower_bound
                    ),
                    "upper_bound": (
                        upper_bound
                    ),
                    "direction": direction,
                }
            )

    return pd.DataFrame(
        anomalies,
        columns=list(
            ANOMALY_COLUMNS
        ),
    )