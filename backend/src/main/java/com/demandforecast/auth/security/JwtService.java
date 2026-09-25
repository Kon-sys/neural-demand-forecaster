package com.demandforecast.auth.security;

import com.demandforecast.user.model.UserEntity;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final Duration expiration;

    public JwtService(
            @Value("${app.security.jwt.secret-base64}")
            String secretBase64,

            @Value("${app.security.jwt.expiration-minutes}")
            long expirationMinutes
    ) {
        byte[] keyBytes =
                Decoders.BASE64.decode(secretBase64);

        this.signingKey =
                Keys.hmacShaKeyFor(keyBytes);

        this.expiration =
                Duration.ofMinutes(expirationMinutes);
    }

    public String generateToken(UserEntity user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(expiration);

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim(
                        "role",
                        user.getRole().name()
                )
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(signingKey)
                .compact();
    }

    public Optional<Long> extractUserId(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            return Optional.of(
                    Long.parseLong(
                            claims.getSubject()
                    )
            );

        } catch (
                JwtException |
                IllegalArgumentException exception
        ) {
            return Optional.empty();
        }
    }

    public long getExpirationSeconds() {
        return expiration.toSeconds();
    }
}