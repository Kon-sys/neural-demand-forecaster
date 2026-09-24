package com.demandforecast.forecast.repository;

import com.demandforecast.forecast.model.ForecastEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ForecastRepository
        extends JpaRepository<ForecastEntity, Long> {

    Optional<ForecastEntity> findByIdAndUser_Id(
            Long id,
            Long userId
    );
}