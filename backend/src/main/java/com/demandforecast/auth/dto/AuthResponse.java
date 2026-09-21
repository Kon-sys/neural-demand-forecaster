package com.demandforecast.auth.dto;

public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        MeResponse user
) {
}