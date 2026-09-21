package com.demandforecast.auth.dto;

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
        Long positionId,
        Instant createdAt,
        Instant updatedAt
) {

    public static MeResponse from(
            UserEntity user
    ) {
        return new MeResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getRole(),
                user.getStatus(),
                user.getPositionId(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}