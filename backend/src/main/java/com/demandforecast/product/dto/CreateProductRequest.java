package com.demandforecast.product.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateProductRequest(

        @NotBlank(message = "SKU is required")
        @Size(max = 64, message = "SKU must not exceed 64 characters")
        String sku,

        @NotBlank(message = "Name is required")
        @Size(max = 255, message = "Name must not exceed 255 characters")
        String name,

        @Size(max = 120, message = "Category must not exceed 120 characters")
        String category
) {
}