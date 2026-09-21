package com.demandforecast.product.dto;

import com.demandforecast.product.model.ProductEntity;

import java.time.OffsetDateTime;

public record ProductResponse(
        Long id,
        String sku,
        String name,
        String category,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {

    public static ProductResponse from(ProductEntity product) {
        return new ProductResponse(
                product.getId(),
                product.getSku(),
                product.getName(),
                product.getCategory(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }
}