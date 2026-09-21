package com.demandforecast.sales.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public record SalesPageResponse(
        List<SaleResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {

    public static SalesPageResponse from(Page<SaleResponse> page) {
        return new SalesPageResponse(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }
}