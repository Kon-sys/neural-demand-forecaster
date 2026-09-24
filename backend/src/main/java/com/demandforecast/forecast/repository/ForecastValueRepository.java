package com.demandforecast.forecast.repository;

import com.demandforecast.forecast.model.ForecastValueEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ForecastValueRepository
        extends JpaRepository<ForecastValueEntity, Long> {

    List<ForecastValueEntity>
    findAllByForecast_IdOrderByForecastDateAsc(
            Long forecastId
    );
}