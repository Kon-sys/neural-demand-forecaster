package com.demandforecast.forecast.client;

import com.demandforecast.common.error.ApiException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
public class MlForecastClient {

    private final RestClient restClient;

    public MlForecastClient(
            @Qualifier("mlRestClient")
            RestClient restClient
    ) {
        this.restClient = restClient;
    }

    public MlHealthResponse health() {
        try {
            MlHealthResponse response =
                    restClient
                            .get()
                            .uri("/health")
                            .retrieve()
                            .body(MlHealthResponse.class);

            if (response == null) {
                throw invalidResponse();
            }

            if (
                    !response.modelLoaded()
                            || !response.scalersLoaded()
                            || response.windowSize() <= 0
            ) {
                throw new ApiException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "ML_SERVICE_NOT_READY",
                        "ML service is not ready for forecasting"
                );
            }

            return response;

        } catch (ApiException exception) {
            throw exception;

        } catch (RestClientResponseException exception) {
            throw mapResponseException(exception);

        } catch (RestClientException exception) {
            throw unavailable();
        }
    }

    public MlPredictResponse predict(
            MlPredictRequest request
    ) {
        try {
            MlPredictResponse response =
                    restClient
                            .post()
                            .uri("/predict")
                            .body(request)
                            .retrieve()
                            .body(MlPredictResponse.class);

            if (response == null) {
                throw invalidResponse();
            }

            return response;

        } catch (ApiException exception) {
            throw exception;

        } catch (RestClientResponseException exception) {
            throw mapResponseException(exception);

        } catch (RestClientException exception) {
            throw unavailable();
        }
    }

    private ApiException mapResponseException(
            RestClientResponseException exception
    ) {
        int status =
                exception.getStatusCode().value();

        if (status == 400 || status == 422) {
            return new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "ML_FORECAST_REJECTED",
                    "ML service rejected forecasting input"
            );
        }

        if (status == 503) {
            return unavailable();
        }

        return new ApiException(
                HttpStatus.BAD_GATEWAY,
                "ML_SERVICE_ERROR",
                "ML service returned an unexpected response"
        );
    }

    private ApiException unavailable() {
        return new ApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "ML_SERVICE_UNAVAILABLE",
                "ML service is unavailable"
        );
    }

    private ApiException invalidResponse() {
        return new ApiException(
                HttpStatus.BAD_GATEWAY,
                "ML_INVALID_RESPONSE",
                "ML service returned an invalid response"
        );
    }
}