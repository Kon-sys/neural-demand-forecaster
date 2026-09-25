package com.demandforecast.sales.dto;

import com.demandforecast.sales.model.SalesEntity;

import java.time.LocalDate;

public record SaleResponse(
        Long id,
        Long productId,
        LocalDate date,
        Integer quantity
) {

    public static SaleResponse from(SalesEntity sale) {
        return new SaleResponse(
                sale.getId(),
                sale.getProduct().getId(),
                sale.getSaleDate(),
                sale.getQuantity()
        );
    }
}