package com.demandforecast.auth.dto;

import com.demandforecast.organization.model.PositionEntity;
import com.demandforecast.user.model.UserEntity;
import com.demandforecast.user.model.UserRole;
import com.demandforecast.user.model.UserStatus;

import java.time.Instant;

public record MeResponse(
        Long id,
        String name,
        String email,
        String avatarUrl,
        UserRole role,
        UserStatus status,
        PositionSummaryResponse position,
        DepartmentSummaryResponse department,
        Instant createdAt,
        Instant updatedAt
) {

    public static MeResponse from(
            UserEntity user,
            PositionEntity position
    ) {
        if (position == null) {
            return new MeResponse(
                    user.getId(),
                    user.getName(),
                    user.getEmail(),
                    user.getAvatarUrl(),
                    user.getRole(),
                    user.getStatus(),
                    null,
                    null,
                    user.getCreatedAt(),
                    user.getUpdatedAt()
            );
        }

        return new MeResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getRole(),
                user.getStatus(),
                new PositionSummaryResponse(
                        position.getId(),
                        position.getName()
                ),
                new DepartmentSummaryResponse(
                        position.getDepartment().getId(),
                        position.getDepartment().getName()
                ),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}