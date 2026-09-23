package com.demandforecast.organization.dto;

import jakarta.validation.constraints.Size;

public record UpdatePositionRequest(

        @Size(
                max = 150,
                message = "Position name must not exceed 150 characters"
        )
        String name,

        Long departmentId,

        Boolean isActive

) {
}