package com.demandforecast.sales.repository;

import com.demandforecast.sales.model.SalesEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;

public interface SalesRepository
        extends JpaRepository<SalesEntity, Long>,
        JpaSpecificationExecutor<SalesEntity> {

    boolean existsByProduct_IdAndSaleDate(
            Long productId,
            LocalDate saleDate
    );
}