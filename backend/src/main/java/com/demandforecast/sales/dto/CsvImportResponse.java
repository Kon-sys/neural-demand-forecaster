package com.demandforecast.sales.dto;

import java.util.List;

public record CsvImportResponse(
        int totalRows,
        int importedRows,
        int skippedRows,
        List<CsvImportError> errors
) {
}