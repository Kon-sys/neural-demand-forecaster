package com.demandforecast.forecast.dto;

import com.demandforecast.forecast.model.ForecastValueEntity;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ForecastValueResponse(
        LocalDate date,
        BigDecimal predictedQuantity
) {

    public static ForecastValueResponse from(
            ForecastValueEntity entity
    ) {
        return new ForecastValueResponse(
                entity.getForecastDate(),
                entity.getPredictedQuantity()
        );
    }
}