package com.demandforecast.forecast.controller;

import com.demandforecast.forecast.dto.CreateForecastRequest;
import com.demandforecast.forecast.dto.ForecastResponse;
import com.demandforecast.forecast.service.ForecastService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/forecasts")
public class ForecastController {

    private final ForecastService forecastService;

    public ForecastController(
            ForecastService forecastService
    ) {
        this.forecastService = forecastService;
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