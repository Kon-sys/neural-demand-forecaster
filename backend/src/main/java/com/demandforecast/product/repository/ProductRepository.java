package com.demandforecast.product.repository;

import com.demandforecast.product.model.ProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<ProductEntity, Long> {

    Optional<ProductEntity> findBySku(String sku);

    boolean existsBySku(String sku);

    boolean existsBySkuAndIdNot(
            String sku,
            Long id
    );
}