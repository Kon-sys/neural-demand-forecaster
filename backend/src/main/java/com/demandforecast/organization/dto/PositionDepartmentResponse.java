package com.demandforecast.organization.dto;

import com.demandforecast.organization.model.DepartmentEntity;

public record PositionDepartmentResponse(
        Long id,
        String name
) {

    public static PositionDepartmentResponse from(
            DepartmentEntity department
    ) {
        return new PositionDepartmentResponse(
                department.getId(),
                department.getName()
        );
    }
}