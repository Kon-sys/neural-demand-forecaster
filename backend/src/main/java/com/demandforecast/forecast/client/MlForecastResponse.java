package com.demandforecast.forecast.client;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record MlForecastResponse(

        @JsonProperty("product_sku")
        String productSku,

        String model,

        @JsonProperty("model_version")
        String modelVersion,

        @JsonProperty("forecast_horizon")
        int forecastHorizon,

        @JsonProperty("window_size")
        int windowSize,

        @JsonProperty("history_points_used")
        int historyPointsUsed,

        List<MlForecastValueResponse> values

) {
}