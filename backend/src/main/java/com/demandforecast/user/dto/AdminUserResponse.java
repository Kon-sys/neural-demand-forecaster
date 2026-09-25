package com.demandforecast.user.dto;

import com.demandforecast.organization.model.PositionEntity;
import com.demandforecast.user.model.UserEntity;
import com.demandforecast.user.model.UserRole;
import com.demandforecast.user.model.UserStatus;

public record AdminUserResponse(
        Long id,
        String name,
        String email,
        String avatarUrl,
        UserRole role,
        UserStatus status,
        UserPositionResponse position,
        UserDepartmentResponse department
) {

    public static AdminUserResponse from(
            UserEntity user,
            PositionEntity position
    ) {
        if (position == null) {
            return new AdminUserResponse(
                    user.getId(),
                    user.getName(),
                    user.getEmail(),
                    user.getAvatarUrl(),
                    user.getRole(),
                    user.getStatus(),
                    null,
                    null
            );
        }

        return new AdminUserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getRole(),
                user.getStatus(),
                UserPositionResponse.from(
                        position
                ),
                UserDepartmentResponse.from(
                        position.getDepartment()
                )
        );
    }
}