package com.demandforecast.forecast.client;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;

public record MlPredictResponse(

        @JsonProperty("product_sku")
        String productSku,

        double prediction,

        String model,

        @JsonProperty("model_version")
        String modelVersion,

        @JsonProperty("window_size")
        int windowSize,

        @JsonProperty("history_points_used")
        int historyPointsUsed,

        @JsonProperty("forecast_date")
        LocalDate forecastDate

) {
}