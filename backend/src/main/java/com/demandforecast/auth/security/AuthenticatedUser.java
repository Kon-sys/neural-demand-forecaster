package com.demandforecast.auth.security;

import com.demandforecast.user.model.UserRole;

public record AuthenticatedUser(
        Long id,
        String email,
        UserRole role
) {
}