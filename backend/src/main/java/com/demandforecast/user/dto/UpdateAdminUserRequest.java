package com.demandforecast.user.dto;

import com.demandforecast.user.model.UserRole;
import com.demandforecast.user.model.UserStatus;
import com.fasterxml.jackson.annotation.JsonSetter;

public class UpdateAdminUserRequest {

    private Long positionId;
    private boolean positionIdPresent;

    private UserRole role;
    private UserStatus status;

    public UpdateAdminUserRequest() {
    }

    public Long positionId() {
        return positionId;
    }

    public boolean positionIdPresent() {
        return positionIdPresent;
    }

    public UserRole role() {
        return role;
    }

    public UserStatus status() {
        return status;
    }

    @JsonSetter("positionId")
    public void setPositionId(
            Long positionId
    ) {
        this.positionId = positionId;
        this.positionIdPresent = true;
    }

    public void setRole(
            UserRole role
    ) {
        this.role = role;
    }

    public void setStatus(
            UserStatus status
    ) {
        this.status = status;
    }
}