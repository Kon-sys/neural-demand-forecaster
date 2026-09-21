package com.demandforecast.sales.dto;

public record CsvImportError(
        int row,
        String code,
        String message
) {
}