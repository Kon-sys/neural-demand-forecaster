package com.demandforecast.forecast.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CreateForecastRequest(

        @NotNull
        Long productId,

        @Min(1)
        @Max(365)
        int forecastHorizon

) {
}