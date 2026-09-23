package com.demandforecast.user.dto;

import com.demandforecast.organization.model.PositionEntity;

public record UserPositionResponse(
        Long id,
        String name
) {

    public static UserPositionResponse from(
            PositionEntity position
    ) {
        return new UserPositionResponse(
                position.getId(),
                position.getName()
        );
    }
}