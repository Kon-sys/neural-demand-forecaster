package com.demandforecast.forecast.client;

import com.fasterxml.jackson.annotation.JsonProperty;

public record MlHealthResponse(

        String status,

        @JsonProperty("model_loaded")
        boolean modelLoaded,

        @JsonProperty("scalers_loaded")
        boolean scalersLoaded,

        String device,

        @JsonProperty("window_size")
        int windowSize,

        @JsonProperty("series_count")
        int seriesCount,

        @JsonProperty("active_model_version")
        String activeModelVersion

) {
}