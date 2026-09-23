package com.demandforecast.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreatePositionRequest(

        @NotBlank(
                message = "Position name is required"
        )
        @Size(
                max = 150,
                message = "Position name must not exceed 150 characters"
        )
        String name,

        @NotNull(
                message = "Department id is required"
        )
        Long departmentId

) {
}