package com.demandforecast.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDepartmentRequest(

        @NotBlank(
                message = "Department name is required"
        )
        @Size(
                max = 150,
                message = "Department name must not exceed 150 characters"
        )
        String name

) {
}