package com.demandforecast.organization.dto;

import com.demandforecast.organization.model.DepartmentEntity;

public record DepartmentResponse(
        Long id,
        String name,
        boolean isActive
) {

    public static DepartmentResponse from(
            DepartmentEntity department
    ) {
        return new DepartmentResponse(
                department.getId(),
                department.getName(),
                department.isActive()
        );
    }
}