package com.demandforecast.organization.service;

import com.demandforecast.common.error.ApiException;
import com.demandforecast.organization.dto.CreatePositionRequest;
import com.demandforecast.organization.dto.PositionResponse;
import com.demandforecast.organization.dto.UpdatePositionRequest;
import com.demandforecast.organization.model.DepartmentEntity;
import com.demandforecast.organization.model.PositionEntity;
import com.demandforecast.organization.repository.DepartmentRepository;
import com.demandforecast.organization.repository.PositionRepository;
import com.demandforecast.user.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class PositionService {

    private final PositionRepository positionRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;

    public PositionService(
            PositionRepository positionRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository
    ) {
        this.positionRepository =
                positionRepository;

        this.departmentRepository =
                departmentRepository;

        this.userRepository =
                userRepository;
    }

    public List<PositionResponse> getPositions(
            Long departmentId,
            Boolean active,
            String search
    ) {
        Specification<PositionEntity> specification =
                (root, query, criteriaBuilder) ->
                        criteriaBuilder.conjunction();

        if (departmentId != null) {
            specification = specification.and(
                    (root, query, criteriaBuilder) ->
                            criteriaBuilder.equal(
                                    root.get("department")
                                            .get("id"),
                                    departmentId
                            )
            );
        }

        if (active != null) {
            specification = specification.and(
                    (root, query, criteriaBuilder) ->
                            criteriaBuilder.equal(
                                    root.get("active"),
                                    active
                            )
            );
        }

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
                            criteriaBuilder.like(
                                    criteriaBuilder.lower(
                                            root.get("name")
                                    ),
                                    "%"
                                            + normalizedSearch
                                            + "%"
                            )
            );
        }

        return positionRepository
                .findAll(
                        specification,
                        Sort.by(
                                Sort.Direction.ASC,
                                "name"
                        )
                )
                .stream()
                .map(PositionResponse::from)
                .toList();
    }

    @Transactional
    public PositionResponse createPosition(
            CreatePositionRequest request
    ) {
        String name =
                normalizeName(
                        request.name()
                );

        DepartmentEntity department =
                getDepartment(
                        request.departmentId()
                );

        ensureDepartmentActive(
                department
        );

        if (
                positionRepository
                        .existsByDepartment_IdAndNameIgnoreCase(
                                department.getId(),
                                name
                        )
        ) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "POSITION_ALREADY_EXISTS",
                    "Position with this name already exists in the department"
            );
        }

        PositionEntity position =
                PositionEntity.create(
                        department,
                        name
                );

        try {
            position =
                    positionRepository
                            .saveAndFlush(
                                    position
                            );
        } catch (
                DataIntegrityViolationException exception
        ) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "POSITION_ALREADY_EXISTS",
                    "Position with this name already exists in the department"
            );
        }

        return PositionResponse.from(
                position
        );
    }

    @Transactional
    public PositionResponse updatePosition(
            Long id,
            UpdatePositionRequest request
    ) {
        PositionEntity position =
                positionRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new ApiException(
                                        HttpStatus.NOT_FOUND,
                                        "RESOURCE_NOT_FOUND",
                                        "Position not found"
                                )
                        );

        if (
                request.name() == null
                        && request.departmentId() == null
                        && request.isActive() == null
        ) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "At least one field must be provided"
            );
        }

        String name =
                position.getName();

        if (request.name() != null) {
            name =
                    normalizeName(
                            request.name()
                    );
        }

        DepartmentEntity department =
                position.getDepartment();

        boolean departmentChanged =
                request.departmentId() != null
                        && !request.departmentId()
                        .equals(
                                department.getId()
                        );

        if (departmentChanged) {

            if (
                    userRepository
                            .existsByPositionId(
                                    position.getId()
                            )
            ) {
                throw new ApiException(
                        HttpStatus.CONFLICT,
                        "POSITION_IN_USE",
                        "Position cannot be moved because it is assigned to users"
                );
            }

            department =
                    getDepartment(
                            request.departmentId()
                    );

            ensureDepartmentActive(
                    department
            );
        }

        if (
                positionRepository
                        .existsByDepartment_IdAndNameIgnoreCaseAndIdNot(
                                department.getId(),
                                name,
                                position.getId()
                        )
        ) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "POSITION_ALREADY_EXISTS",
                    "Position with this name already exists in the department"
            );
        }

        boolean active =
                request.isActive() != null
                        ? request.isActive()
                        : position.isActive();

        position.update(
                department,
                name,
                active
        );

        try {
            positionRepository.flush();
        } catch (
                DataIntegrityViolationException exception
        ) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "POSITION_ALREADY_EXISTS",
                    "Position with this name already exists in the department"
            );
        }

        return PositionResponse.from(
                position
        );
    }

    private DepartmentEntity getDepartment(
            Long departmentId
    ) {
        return departmentRepository
                .findById(departmentId)
                .orElseThrow(() ->
                        new ApiException(
                                HttpStatus.NOT_FOUND,
                                "RESOURCE_NOT_FOUND",
                                "Department not found"
                        )
                );
    }

    private void ensureDepartmentActive(
            DepartmentEntity department
    ) {
        if (!department.isActive()) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "DEPARTMENT_INACTIVE",
                    "Department is inactive"
            );
        }
    }

    private String normalizeName(
            String name
    ) {
        String normalizedName =
                name.trim();

        if (normalizedName.isBlank()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "Position name must not be blank"
            );
        }

        return normalizedName;
    }
}