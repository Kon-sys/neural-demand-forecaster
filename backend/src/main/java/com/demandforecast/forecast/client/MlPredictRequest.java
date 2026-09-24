package com.demandforecast.forecast.client;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;
import java.util.List;

public record MlPredictRequest(

        @JsonProperty("product_sku")
        String productSku,

        List<Double> history,

        @JsonProperty("last_observation_date")
        LocalDate lastObservationDate

) {
}