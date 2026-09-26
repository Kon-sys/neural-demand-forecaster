package com.demandforecast.forecast.dto;

import com.demandforecast.forecast.model.ForecastEntity;
import com.demandforecast.forecast.model.ForecastStatus;
import com.demandforecast.forecast.model.ForecastValueEntity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record ForecastResponse(
        Long id,
        Long userId,
        Long productId,
        String productSku,
        String productName,
        int forecastHorizon,
        String modelVersion,
        ForecastStatus status,
        BigDecimal mae,
        BigDecimal rmse,
        BigDecimal mape,
        OffsetDateTime createdAt,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt,
        String errorMessage,
        List<ForecastValueResponse> values
) {

    public static ForecastResponse from(
            ForecastEntity forecast,
            List<ForecastValueEntity> values
    ) {
        return new ForecastResponse(
                forecast.getId(),
                forecast.getUser().getId(),
                forecast.getProduct().getId(),
                forecast.getProduct().getSku(),
                forecast.getProduct().getName(),
                forecast.getForecastHorizon(),
                forecast.getModelVersion(),
                forecast.getStatus(),
                forecast.getMae(),
                forecast.getRmse(),
                forecast.getMape(),
                forecast.getCreatedAt(),
                forecast.getStartedAt(),
                forecast.getCompletedAt(),
                forecast.getErrorMessage(),
                values.stream()
                        .map(ForecastValueResponse::from)
                        .toList()
        );
    }
}
