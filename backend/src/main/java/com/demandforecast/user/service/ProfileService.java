package com.demandforecast.user.service;

import com.demandforecast.auth.dto.MeResponse;
import com.demandforecast.auth.security.AuthenticatedUser;
import com.demandforecast.common.error.ApiException;
import com.demandforecast.organization.model.PositionEntity;
import com.demandforecast.organization.repository.PositionRepository;
import com.demandforecast.user.dto.UpdateProfileRequest;
import com.demandforecast.user.model.UserEntity;
import com.demandforecast.user.model.UserStatus;
import com.demandforecast.user.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final PositionRepository positionRepository;

    public ProfileService(
            UserRepository userRepository,
            PositionRepository positionRepository
    ) {
        this.userRepository = userRepository;
        this.positionRepository = positionRepository;
    }

    @Transactional
    public MeResponse updateProfile(
            AuthenticatedUser principal,
            UpdateProfileRequest request
    ) {
        UserEntity user = userRepository
                .findById(principal.id())
                .orElseThrow(() ->
                        new ApiException(
                                HttpStatus.UNAUTHORIZED,
                                "USER_NOT_FOUND",
                                "Authenticated user does not exist"
                        )
                );

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "USER_BLOCKED",
                    "User account is blocked"
            );
        }

        String name = request.name().trim();
        String email = normalizeEmail(request.email());

        if (
                userRepository
                        .existsByEmailIgnoreCaseAndIdNot(
                                email,
                                user.getId()
                        )
        ) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "EMAIL_ALREADY_EXISTS",
                    "User with this email already exists"
            );
        }

        user.setName(name);
        user.setEmail(email);

        try {
            userRepository.flush();
        } catch (DataIntegrityViolationException exception) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "EMAIL_ALREADY_EXISTS",
                    "User with this email already exists"
            );
        }

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

    private String normalizeEmail(
            String email
    ) {
        return email
                .trim()
                .toLowerCase(Locale.ROOT);
    }
}