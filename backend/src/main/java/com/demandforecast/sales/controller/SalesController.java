package com.demandforecast.sales.controller;

import com.demandforecast.sales.dto.SalesPageResponse;
import com.demandforecast.sales.service.SalesService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.demandforecast.sales.dto.CsvImportResponse;
import com.demandforecast.sales.service.SalesCsvImportService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/sales")
public class SalesController {

    private final SalesService salesService;

    private final SalesCsvImportService salesCsvImportService;

    public SalesController(
            SalesService salesService,
            SalesCsvImportService salesCsvImportService
    ) {
        this.salesService = salesService;
        this.salesCsvImportService = salesCsvImportService;
    }

    @GetMapping
    public SalesPageResponse getSales(
            @RequestParam(required = false)
            Long productId,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate dateFrom,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate dateTo,

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "50")
            int size
    ) {
        return salesService.getSales(
                productId,
                dateFrom,
                dateTo,
                page,
                size
        );
    }

    @PostMapping(
            value = "/import",
            consumes = "multipart/form-data"
    )
    public CsvImportResponse importCsv(
            @RequestPart("file") MultipartFile file
    ) {
        return salesCsvImportService.importCsv(file);
    }
}