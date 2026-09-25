package com.demandforecast.sales.repository;

import com.demandforecast.sales.model.SalesEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SalesRepository
        extends JpaRepository<SalesEntity, Long>,
        JpaSpecificationExecutor<SalesEntity> {

    boolean existsByProduct_IdAndSaleDate(
            Long productId,
            LocalDate saleDate
    );

    Optional<SalesEntity>
    findFirstByProduct_IdOrderBySaleDateAsc(
            Long productId
    );

    Optional<SalesEntity>
    findFirstByProduct_IdOrderBySaleDateDesc(
            Long productId
    );

    List<SalesEntity>
    findByProduct_IdAndSaleDateBetweenOrderBySaleDateAsc(
            Long productId,
            LocalDate dateFrom,
            LocalDate dateTo
    );
}