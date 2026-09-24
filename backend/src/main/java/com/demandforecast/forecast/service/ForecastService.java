package com.demandforecast.forecast.service;

import com.demandforecast.common.error.ApiException;
import com.demandforecast.forecast.client.MlForecastClient;
import com.demandforecast.forecast.client.MlHealthResponse;
import com.demandforecast.forecast.client.MlPredictRequest;
import com.demandforecast.forecast.client.MlPredictResponse;
import com.demandforecast.forecast.dto.CreateForecastRequest;
import com.demandforecast.forecast.dto.ForecastResponse;
import com.demandforecast.forecast.model.ForecastEntity;
import com.demandforecast.forecast.model.ForecastValueEntity;
import com.demandforecast.forecast.repository.ForecastRepository;
import com.demandforecast.forecast.repository.ForecastValueRepository;
import com.demandforecast.product.model.ProductEntity;
import com.demandforecast.product.repository.ProductRepository;
import com.demandforecast.sales.model.SalesEntity;
import com.demandforecast.sales.repository.SalesRepository;
import com.demandforecast.user.model.UserEntity;
import com.demandforecast.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ForecastService {

    private final ForecastRepository forecastRepository;
    private final ForecastValueRepository forecastValueRepository;
    private final SalesRepository salesRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final MlForecastClient mlForecastClient;

    public ForecastService(
            ForecastRepository forecastRepository,
            ForecastValueRepository forecastValueRepository,
            SalesRepository salesRepository,
            ProductRepository productRepository,
            UserRepository userRepository,
            MlForecastClient mlForecastClient
    ) {
        this.forecastRepository = forecastRepository;
        this.forecastValueRepository = forecastValueRepository;
        this.salesRepository = salesRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.mlForecastClient = mlForecastClient;
    }

    public ForecastResponse create(
            Long userId,
            CreateForecastRequest request
    ) {
        UserEntity user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() ->
                                new ApiException(
                                        HttpStatus.NOT_FOUND,
                                        "USER_NOT_FOUND",
                                        "User not found"
                                )
                        );

        ProductEntity product =
                productRepository
                        .findById(request.productId())
                        .orElseThrow(() ->
                                new ApiException(
                                        HttpStatus.NOT_FOUND,
                                        "PRODUCT_NOT_FOUND",
                                        "Product not found"
                                )
                        );

        MlHealthResponse health =
                mlForecastClient.health();

        int windowSize =
                health.windowSize();

        String modelVersion =
                normalizeModelVersion(
                        health.activeModelVersion()
                );

        Deque<Double> history =
                loadHistory(
                        product.getId(),
                        windowSize
                );

        LocalDate lastObservationDate =
                salesRepository
                        .findFirstByProduct_IdOrderBySaleDateDesc(
                                product.getId()
                        )
                        .map(SalesEntity::getSaleDate)
                        .orElseThrow(() ->
                                insufficientHistory(
                                        windowSize
                                )
                        );

        ForecastEntity forecast =
                ForecastEntity.create(
                        user,
                        product,
                        request.forecastHorizon(),
                        modelVersion
                );

        forecastRepository.saveAndFlush(
                forecast
        );

        forecast.markProcessing();

        forecastRepository.saveAndFlush(
                forecast
        );

        List<ForecastValueEntity> values =
                new ArrayList<>(
                        request.forecastHorizon()
                );

        try {
            LocalDate currentDate =
                    lastObservationDate;

            for (
                    int step = 0;
                    step < request.forecastHorizon();
                    step++
            ) {
                MlPredictResponse prediction =
                        mlForecastClient.predict(
                                new MlPredictRequest(
                                        product.getSku(),
                                        new ArrayList<>(
                                                history
                                        ),
                                        currentDate
                                )
                        );

                validatePrediction(
                        prediction,
                        product.getSku(),
                        modelVersion,
                        currentDate,
                        windowSize
                );

                LocalDate forecastDate =
                        prediction.forecastDate();

                double predictedQuantity =
                        prediction.prediction();

                values.add(
                        ForecastValueEntity.create(
                                forecast,
                                forecastDate,
                                BigDecimal
                                        .valueOf(
                                                predictedQuantity
                                        )
                                        .setScale(
                                                4,
                                                RoundingMode.HALF_UP
                                        )
                        )
                );

                history.removeFirst();
                history.addLast(
                        predictedQuantity
                );

                currentDate =
                        forecastDate;
            }

            forecastValueRepository.saveAll(
                    values
            );

            forecast.markCompleted(
                    modelVersion
            );

            forecastRepository.saveAndFlush(
                    forecast
            );

            return ForecastResponse.from(
                    forecast,
                    values
            );

        } catch (ApiException exception) {
            markFailed(
                    forecast,
                    exception.getMessage()
            );

            throw exception;

        } catch (RuntimeException exception) {
            markFailed(
                    forecast,
                    exception.getMessage()
            );

            throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "FORECAST_GENERATION_FAILED",
                    "Unable to generate forecast"
            );
        }
    }

    @Transactional(readOnly = true)
    public ForecastResponse getById(
            Long userId,
            Long forecastId
    ) {
        ForecastEntity forecast =
                forecastRepository
                        .findByIdAndUser_Id(
                                forecastId,
                                userId
                        )
                        .orElseThrow(() ->
                                new ApiException(
                                        HttpStatus.NOT_FOUND,
                                        "FORECAST_NOT_FOUND",
                                        "Forecast not found"
                                )
                        );

        List<ForecastValueEntity> values =
                forecastValueRepository
                        .findAllByForecast_IdOrderByForecastDateAsc(
                                forecast.getId()
                        );

        return ForecastResponse.from(
                forecast,
                values
        );
    }

    private Deque<Double> loadHistory(
            Long productId,
            int windowSize
    ) {
        SalesEntity firstSale =
                salesRepository
                        .findFirstByProduct_IdOrderBySaleDateAsc(
                                productId
                        )
                        .orElseThrow(() ->
                                insufficientHistory(
                                        windowSize
                                )
                        );

        SalesEntity lastSale =
                salesRepository
                        .findFirstByProduct_IdOrderBySaleDateDesc(
                                productId
                        )
                        .orElseThrow(() ->
                                insufficientHistory(
                                        windowSize
                                )
                        );

        LocalDate historyStart =
                lastSale
                        .getSaleDate()
                        .minusDays(
                                windowSize - 1L
                        );

        if (
                firstSale
                        .getSaleDate()
                        .isAfter(historyStart)
        ) {
            throw insufficientHistory(
                    windowSize
            );
        }

        List<SalesEntity> sales =
                salesRepository
                        .findByProduct_IdAndSaleDateBetweenOrderBySaleDateAsc(
                                productId,
                                historyStart,
                                lastSale.getSaleDate()
                        );

        Map<LocalDate, Double> quantities =
                new HashMap<>();

        for (SalesEntity sale : sales) {
            quantities.put(
                    sale.getSaleDate(),
                    sale.getQuantity().doubleValue()
            );
        }

        Deque<Double> history =
                new ArrayDeque<>(
                        windowSize
                );

        for (
                int offset = 0;
                offset < windowSize;
                offset++
        ) {
            LocalDate date =
                    historyStart.plusDays(
                            offset
                    );

            history.addLast(
                    quantities.getOrDefault(
                            date,
                            0.0
                    )
            );
        }

        return history;
    }

    private void validatePrediction(
            MlPredictResponse prediction,
            String expectedSku,
            String expectedModelVersion,
            LocalDate lastObservationDate,
            int expectedWindowSize
    ) {
        if (
                prediction.productSku() == null
                        || !prediction.productSku().equals(
                        expectedSku
                )
        ) {
            throw invalidMlResponse();
        }

        if (
                !Double.isFinite(
                        prediction.prediction()
                )
                        || prediction.prediction() < 0.0
        ) {
            throw invalidMlResponse();
        }

        if (
                prediction.windowSize()
                        != expectedWindowSize
        ) {
            throw invalidMlResponse();
        }

        LocalDate expectedForecastDate =
                lastObservationDate.plusDays(1);

        if (
                prediction.forecastDate() == null
                        || !prediction.forecastDate()
                        .equals(
                                expectedForecastDate
                        )
        ) {
            throw invalidMlResponse();
        }

        String responseModelVersion =
                normalizeModelVersion(
                        prediction.modelVersion()
                );

        if (
                !expectedModelVersion.equals(
                        responseModelVersion
                )
        ) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "ML_MODEL_CHANGED_DURING_FORECAST",
                    "ML model changed while the forecast was being generated"
            );
        }
    }

    private String normalizeModelVersion(
            String modelVersion
    ) {
        if (
                modelVersion == null
                        || modelVersion.isBlank()
        ) {
            return "bootstrap";
        }

        return modelVersion.trim();
    }

    private void markFailed(
            ForecastEntity forecast,
            String message
    ) {
        forecast.markFailed(
                message
        );

        forecastRepository.saveAndFlush(
                forecast
        );
    }

    private ApiException insufficientHistory(
            int windowSize
    ) {
        return new ApiException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "INSUFFICIENT_SALES_HISTORY",
                "At least "
                        + windowSize
                        + " calendar days of sales history are required"
        );
    }

    private ApiException invalidMlResponse() {
        return new ApiException(
                HttpStatus.BAD_GATEWAY,
                "ML_INVALID_RESPONSE",
                "ML service returned an invalid forecast response"
        );
    }
}