package com.demandforecast.organization.dto;

import jakarta.validation.constraints.Size;

public record UpdateDepartmentRequest(

        @Size(
                max = 150,
                message = "Department name must not exceed 150 characters"
        )
        String name,

        Boolean isActive

) {
}