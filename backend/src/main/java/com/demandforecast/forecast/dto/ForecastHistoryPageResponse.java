package com.demandforecast.forecast.dto;

import com.demandforecast.forecast.model.ForecastEntity;
import org.springframework.data.domain.Page;

import java.util.List;

public record ForecastHistoryPageResponse(

        List<ForecastHistoryItemResponse> items,

        int page,

        int size,

        long totalElements,

        int totalPages

) {

    public static ForecastHistoryPageResponse from(
            Page<ForecastEntity> result
    ) {
        return new ForecastHistoryPageResponse(
                result.getContent()
                        .stream()
                        .map(ForecastHistoryItemResponse::from)
                        .toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );
    }
}