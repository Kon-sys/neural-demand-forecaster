package com.demandforecast.forecast.repository;

import com.demandforecast.forecast.model.ForecastEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;

import java.util.Optional;

public interface ForecastRepository
        extends JpaRepository<ForecastEntity, Long>,
        JpaSpecificationExecutor<ForecastEntity> {

    Optional<ForecastEntity> findByIdAndUser_Id(
            Long id,
            Long userId
    );

    @Override
    @EntityGraph(
            attributePaths = {
                    "product"
            }
    )
    Page<ForecastEntity> findAll(
            Specification<ForecastEntity> specification,
            Pageable pageable
    );
}