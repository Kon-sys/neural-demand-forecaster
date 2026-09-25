package com.demandforecast.forecast.controller;

import com.demandforecast.forecast.dto.CreateForecastRequest;
import com.demandforecast.forecast.dto.ForecastHistoryPageResponse;
import com.demandforecast.forecast.dto.ForecastResponse;
import com.demandforecast.forecast.service.ForecastQueryService;
import com.demandforecast.forecast.service.ForecastService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/forecasts")
public class ForecastController {

    private final ForecastService forecastService;
    private final ForecastQueryService forecastQueryService;

    public ForecastController(
            ForecastService forecastService,
            ForecastQueryService forecastQueryService
    ) {
        this.forecastService =
                forecastService;

        this.forecastQueryService =
                forecastQueryService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ForecastResponse create(
            @AuthenticationPrincipal(expression = "id")
            Long userId,

            @Valid
            @RequestBody
            CreateForecastRequest request
    ) {
        return forecastService.create(
                userId,
                request
        );
    }

    @GetMapping
    public ForecastHistoryPageResponse getHistory(
            @AuthenticationPrincipal(expression = "id")
            Long userId,

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

            @RequestParam(defaultValue = "20")
            int size
    ) {
        return forecastQueryService.getHistory(
                userId,
                productId,
                dateFrom,
                dateTo,
                page,
                size
        );
    }

    @GetMapping("/{forecastId}")
    public ForecastResponse getById(
            @AuthenticationPrincipal(expression = "id")
            Long userId,

            @PathVariable
            Long forecastId
    ) {
        return forecastService.getById(
                userId,
                forecastId
        );
    }
}