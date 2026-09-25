package com.demandforecast.organization.dto;

import com.demandforecast.organization.model.PositionEntity;

public record PositionResponse(
        Long id,
        String name,
        boolean isActive,
        PositionDepartmentResponse department
) {

    public static PositionResponse from(
            PositionEntity position
    ) {
        return new PositionResponse(
                position.getId(),
                position.getName(),
                position.isActive(),
                PositionDepartmentResponse.from(
                        position.getDepartment()
                )
        );
    }
}