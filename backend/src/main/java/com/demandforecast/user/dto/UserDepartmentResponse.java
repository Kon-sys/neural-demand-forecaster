package com.demandforecast.user.dto;

import com.demandforecast.organization.model.DepartmentEntity;

public record UserDepartmentResponse(
        Long id,
        String name
) {

    public static UserDepartmentResponse from(
            DepartmentEntity department
    ) {
        return new UserDepartmentResponse(
                department.getId(),
                department.getName()
        );
    }
}