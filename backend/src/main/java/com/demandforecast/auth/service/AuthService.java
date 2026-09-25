package com.demandforecast.auth.service;

import com.demandforecast.auth.dto.AuthResponse;
import com.demandforecast.auth.dto.LoginRequest;
import com.demandforecast.auth.dto.MeResponse;
import com.demandforecast.auth.dto.RegisterRequest;
import com.demandforecast.auth.security.AuthenticatedUser;
import com.demandforecast.auth.security.JwtService;
import com.demandforecast.common.error.ApiException;
import com.demandforecast.user.model.UserEntity;
import com.demandforecast.user.model.UserRole;
import com.demandforecast.user.model.UserStatus;
import com.demandforecast.user.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.demandforecast.organization.model.PositionEntity;
import com.demandforecast.organization.repository.PositionRepository;

import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final PositionRepository positionRepository;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            PositionRepository positionRepository
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.positionRepository = positionRepository;
    }

    @Transactional
    public AuthResponse register(
            RegisterRequest request
    ) {
        String name =
                request.name().trim();

        String email =
                normalizeEmail(request.email());

        if (
                userRepository
                        .existsByEmailIgnoreCase(email)
        ) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "EMAIL_ALREADY_EXISTS",
                    "User with this email already exists"
            );
        }

        String passwordHash =
                passwordEncoder.encode(
                        request.password()
                );

        UserEntity user =
                UserEntity.create(
                        name,
                        email,
                        passwordHash,
                        UserRole.USER
                );

        try {
            user = userRepository.save(user);
            userRepository.flush();

        } catch (
                DataIntegrityViolationException exception
        ) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "EMAIL_ALREADY_EXISTS",
                    "User with this email already exists"
            );
        }

        return createAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(
            LoginRequest request
    ) {
        String email =
                normalizeEmail(request.email());

        UserEntity user =
                userRepository
                        .findByEmailIgnoreCase(email)
                        .orElseThrow(() ->
                                new ApiException(
                                        HttpStatus.UNAUTHORIZED,
                                        "INVALID_CREDENTIALS",
                                        "Invalid email or password"
                                )
                        );

        if (
                !passwordEncoder.matches(
                        request.password(),
                        user.getPasswordHash()
                )
        ) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_CREDENTIALS",
                    "Invalid email or password"
            );
        }

        if (
                user.getStatus()
                        == UserStatus.BLOCKED
        ) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "USER_BLOCKED",
                    "User account is blocked"
            );
        }

        return createAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public MeResponse getMe(
            AuthenticatedUser principal
    ) {
        UserEntity user =
                userRepository
                        .findById(principal.id())
                        .orElseThrow(() ->
                                new ApiException(
                                        HttpStatus.UNAUTHORIZED,
                                        "USER_NOT_FOUND",
                                        "Authenticated user does not exist"
                                )
                        );

        if (
                user.getStatus()
                        != UserStatus.ACTIVE
        ) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "USER_BLOCKED",
                    "User account is blocked"
            );
        }

        return createMeResponse(user);
    }

    private AuthResponse createAuthResponse(
            UserEntity user
    ) {
        String token =
                jwtService.generateToken(user);

        return new AuthResponse(
                token,
                "Bearer",
                jwtService.getExpirationSeconds(),
                createMeResponse(user)
        );
    }

    private String normalizeEmail(
            String email
    ) {
        return email
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private MeResponse createMeResponse(
            UserEntity user
    ) {
        PositionEntity position = null;

        if (user.getPositionId() != null) {
            position = positionRepository
                    .findById(user.getPositionId())
                    .orElse(null);
        }

        return MeResponse.from(
                user,
                position
        );
    }
}