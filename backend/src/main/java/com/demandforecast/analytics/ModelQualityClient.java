package com.demandforecast.analytics;

import com.demandforecast.common.error.ApiException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class ModelQualityClient {
    private final RestClient client;
    public ModelQualityClient(@Qualifier("mlRestClient") RestClient client) { this.client = client; }

    public ModelQualityResponse get() {
        try {
            var response = client.get().uri("/analytics/model-quality").retrieve().body(ModelQualityResponse.class);
            if (response == null || response.schemaVersion() != 1 || response.metrics() == null
                    || response.metrics().size() != 2 || response.daily() == null || response.daily().isEmpty()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "ML_INVALID_EVALUATION", "Invalid model evaluation response");
            }
            return response;
        } catch (RestClientException exception) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "MODEL_QUALITY_UNAVAILABLE", "Model evaluation is unavailable");
        }
    }
}
