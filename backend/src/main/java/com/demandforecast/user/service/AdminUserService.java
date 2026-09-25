package com.demandforecast.user.service;

import com.demandforecast.auth.security.AuthenticatedUser;
import com.demandforecast.common.error.ApiException;
import com.demandforecast.organization.model.PositionEntity;
import com.demandforecast.organization.repository.PositionRepository;
import com.demandforecast.user.dto.AdminUserPageResponse;
import com.demandforecast.user.dto.AdminUserResponse;
import com.demandforecast.user.dto.UpdateAdminUserRequest;
import com.demandforecast.user.model.UserEntity;
import com.demandforecast.user.model.UserRole;
import com.demandforecast.user.model.UserStatus;
import com.demandforecast.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AdminUserService {

    private final UserRepository userRepository;
    private final PositionRepository positionRepository;

    public AdminUserService(
            UserRepository userRepository,
            PositionRepository positionRepository
    ) {
        this.userRepository =
                userRepository;

        this.positionRepository =
                positionRepository;
    }

    public AdminUserPageResponse getUsers(
            String search,
            UserRole role,
            UserStatus status,
            Long departmentId,
            Long positionId,
            int page,
            int size
    ) {
        validatePage(
                page,
                size
        );

        Specification<UserEntity> specification =
                (root, query, criteriaBuilder) ->
                        criteriaBuilder.conjunction();

        if (
                search != null
                        && !search.isBlank()
        ) {
            String normalizedSearch =
                    search
                            .trim()
                            .toLowerCase(Locale.ROOT);

            specification = specification.and(
                    (root, query, criteriaBuilder) ->
                            criteriaBuilder.or(
                                    criteriaBuilder.like(
                                            criteriaBuilder.lower(
                                                    root.get("name")
                                            ),
                                            "%"
                                                    + normalizedSearch
                                                    + "%"
                                    ),
                                    criteriaBuilder.like(
                                            criteriaBuilder.lower(
                                                    root.get("email")
                                            ),
                                            "%"
                                                    + normalizedSearch
                                                    + "%"
                                    )
                            )
            );
        }

        if (role != null) {
            specification = specification.and(
                    (root, query, criteriaBuilder) ->
                            criteriaBuilder.equal(
                                    root.get("role"),
                                    role
                            )
            );
        }

        if (status != null) {
            specification = specification.and(
                    (root, query, criteriaBuilder) ->
                            criteriaBuilder.equal(
                                    root.get("status"),
                                    status
                            )
            );
        }

        if (positionId != null) {
            specification = specification.and(
                    (root, query, criteriaBuilder) ->
                            criteriaBuilder.equal(
                                    root.get("positionId"),
                                    positionId
                            )
            );
        }

        if (departmentId != null) {

            List<Long> departmentPositionIds =
                    positionRepository
                            .findAllByDepartment_Id(
                                    departmentId
                            )
                            .stream()
                            .map(PositionEntity::getId)
                            .toList();

            if (departmentPositionIds.isEmpty()) {
                specification = specification.and(
                        (root, query, criteriaBuilder) ->
                                criteriaBuilder.disjunction()
                );
            } else {
                specification = specification.and(
                        (root, query, criteriaBuilder) ->
                                root
                                        .get("positionId")
                                        .in(
                                                departmentPositionIds
                                        )
                );
            }
        }

        Page<UserEntity> users =
                userRepository.findAll(
                        specification,
                        PageRequest.of(
                                page,
                                size,
                                Sort.by(
                                        Sort.Order.asc("name"),
                                        Sort.Order.asc("id")
                                )
                        )
                );

        Map<Long, PositionEntity> positions =
                loadPositions(
                        users.getContent()
                );

        List<AdminUserResponse> items =
                users
                        .getContent()
                        .stream()
                        .map(user ->
                                AdminUserResponse.from(
                                        user,
                                        user.getPositionId() == null
                                                ? null
                                                : positions.get(
                                                user.getPositionId()
                                        )
                                )
                        )
                        .toList();

        return new AdminUserPageResponse(
                items,
                users.getNumber(),
                users.getSize(),
                users.getTotalElements(),
                users.getTotalPages()
        );
    }

    public AdminUserResponse getUser(
            Long id
    ) {
        UserEntity user =
                findUser(id);

        PositionEntity position =
                findCurrentPosition(user);

        return AdminUserResponse.from(
                user,
                position
        );
    }

    @Transactional
    public AdminUserResponse updateUser(
            AuthenticatedUser principal,
            Long id,
            UpdateAdminUserRequest request
    ) {
        UserEntity user =
                findUser(id);

        if (
                !request.positionIdPresent()
                        && request.role() == null
                        && request.status() == null
        ) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "At least one field must be provided"
            );
        }

        validateSelfRestrictions(
                principal,
                user,
                request
        );

        UserRole newRole =
                request.role() != null
                        ? request.role()
                        : user.getRole();

        UserStatus newStatus =
                request.status() != null
                        ? request.status()
                        : user.getStatus();

        validateLastActiveAdmin(
                user,
                newRole,
                newStatus
        );

        if (request.positionIdPresent()) {

            if (request.positionId() == null) {

                user.setPositionId(null);

            } else {

                PositionEntity position =
                        positionRepository
                                .findById(
                                        request.positionId()
                                )
                                .orElseThrow(() ->
                                        new ApiException(
                                                HttpStatus.NOT_FOUND,
                                                "RESOURCE_NOT_FOUND",
                                                "Position not found"
                                        )
                                );

                if (!position.isActive()) {
                    throw new ApiException(
                            HttpStatus.CONFLICT,
                            "POSITION_INACTIVE",
                            "Position is inactive"
                    );
                }

                if (
                        !position
                                .getDepartment()
                                .isActive()
                ) {
                    throw new ApiException(
                            HttpStatus.CONFLICT,
                            "DEPARTMENT_INACTIVE",
                            "Department is inactive"
                    );
                }

                user.setPositionId(
                        position.getId()
                );
            }
        }

        user.setRole(
                newRole
        );

        updateStatus(
                user,
                newStatus
        );

        userRepository.flush();

        return AdminUserResponse.from(
                user,
                findCurrentPosition(user)
        );
    }

    private UserEntity findUser(
            Long id
    ) {
        return userRepository
                .findById(id)
                .orElseThrow(() ->
                        new ApiException(
                                HttpStatus.NOT_FOUND,
                                "RESOURCE_NOT_FOUND",
                                "User not found"
                        )
                );
    }

    private PositionEntity findCurrentPosition(
            UserEntity user
    ) {
        if (user.getPositionId() == null) {
            return null;
        }

        return positionRepository
                .findById(
                        user.getPositionId()
                )
                .orElse(null);
    }

    private Map<Long, PositionEntity> loadPositions(
            List<UserEntity> users
    ) {
        Set<Long> positionIds =
                users
                        .stream()
                        .map(
                                UserEntity::getPositionId
                        )
                        .filter(
                                id -> id != null
                        )
                        .collect(
                                Collectors.toSet()
                        );

        if (positionIds.isEmpty()) {
            return Map.of();
        }

        return positionRepository
                .findAllById(
                        positionIds
                )
                .stream()
                .collect(
                        Collectors.toMap(
                                PositionEntity::getId,
                                Function.identity()
                        )
                );
    }

    private void validateSelfRestrictions(
            AuthenticatedUser principal,
            UserEntity user,
            UpdateAdminUserRequest request
    ) {
        if (
                !principal
                        .id()
                        .equals(
                                user.getId()
                        )
        ) {
            return;
        }

        if (
                request.status()
                        == UserStatus.BLOCKED
        ) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "SELF_ADMIN_RESTRICTION",
                    "Administrator cannot block own account"
            );
        }

        if (
                request.role()
                        == UserRole.USER
        ) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "SELF_ADMIN_RESTRICTION",
                    "Administrator cannot remove own ADMIN role"
            );
        }
    }

    private void validateLastActiveAdmin(
            UserEntity user,
            UserRole newRole,
            UserStatus newStatus
    ) {
        boolean currentlyActiveAdmin =
                user.getRole()
                        == UserRole.ADMIN
                        && user.getStatus()
                        == UserStatus.ACTIVE;

        boolean remainsActiveAdmin =
                newRole
                        == UserRole.ADMIN
                        && newStatus
                        == UserStatus.ACTIVE;

        if (
                !currentlyActiveAdmin
                        || remainsActiveAdmin
        ) {
            return;
        }

        long activeAdmins =
                userRepository
                        .countByRoleAndStatus(
                                UserRole.ADMIN,
                                UserStatus.ACTIVE
                        );

        if (activeAdmins <= 1) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "LAST_ACTIVE_ADMIN",
                    "Last active administrator cannot be blocked or demoted"
            );
        }
    }

    private void updateStatus(
            UserEntity user,
            UserStatus newStatus
    ) {
        if (
                newStatus
                        == UserStatus.BLOCKED
        ) {
            if (
                    user.getStatus()
                            != UserStatus.BLOCKED
                            || user.getBlockedAt() == null
            ) {
                user.setBlockedAt(
                        Instant.now()
                );
            }
        } else {
            user.setBlockedAt(
                    null
            );
        }

        user.setStatus(
                newStatus
        );
    }

    private void validatePage(
            int page,
            int size
    ) {
        if (page < 0) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_PAGE",
                    "Page must not be negative"
            );
        }

        if (
                size <= 0
                        || size > 100
        ) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_PAGE_SIZE",
                    "Size must be between 1 and 100"
            );
        }
    }
}