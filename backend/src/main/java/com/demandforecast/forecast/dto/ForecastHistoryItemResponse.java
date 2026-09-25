package com.demandforecast.forecast.dto;

import com.demandforecast.forecast.model.ForecastEntity;
import com.demandforecast.forecast.model.ForecastStatus;

import java.time.OffsetDateTime;

public record ForecastHistoryItemResponse(

        Long id,

        Long productId,

        String productSku,

        String productName,

        int forecastHorizon,

        String modelVersion,

        ForecastStatus status,

        OffsetDateTime createdAt,

        OffsetDateTime completedAt

) {

    public static ForecastHistoryItemResponse from(
            ForecastEntity forecast
    ) {
        return new ForecastHistoryItemResponse(
                forecast.getId(),
                forecast.getProduct().getId(),
                forecast.getProduct().getSku(),
                forecast.getProduct().getName(),
                forecast.getForecastHorizon(),
                forecast.getModelVersion(),
                forecast.getStatus(),
                forecast.getCreatedAt(),
                forecast.getCompletedAt()
        );
    }
}