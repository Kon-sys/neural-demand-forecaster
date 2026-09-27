package com.demandforecast.forecast.client;

import java.time.LocalDate;

public record MlForecastValueResponse(

        LocalDate date,

        double prediction

) {
}