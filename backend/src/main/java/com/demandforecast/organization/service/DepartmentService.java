package com.demandforecast.organization.service;

import com.demandforecast.common.error.ApiException;
import com.demandforecast.organization.dto.CreateDepartmentRequest;
import com.demandforecast.organization.dto.DepartmentResponse;
import com.demandforecast.organization.dto.UpdateDepartmentRequest;
import com.demandforecast.organization.model.DepartmentEntity;
import com.demandforecast.organization.repository.DepartmentRepository;
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
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public DepartmentService(
            DepartmentRepository departmentRepository
    ) {
        this.departmentRepository =
                departmentRepository;
    }

    public List<DepartmentResponse> getDepartments(
            Boolean active,
            String search
    ) {
        Specification<DepartmentEntity> specification =
                (root, query, criteriaBuilder) ->
                        criteriaBuilder.conjunction();

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

        return departmentRepository
                .findAll(
                        specification,
                        Sort.by(
                                Sort.Direction.ASC,
                                "name"
                        )
                )
                .stream()
                .map(DepartmentResponse::from)
                .toList();
    }

    @Transactional
    public DepartmentResponse createDepartment(
            CreateDepartmentRequest request
    ) {
        String name =
                normalizeName(
                        request.name()
                );

        if (
                departmentRepository
                        .existsByNameIgnoreCase(name)
        ) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "DEPARTMENT_ALREADY_EXISTS",
                    "Department with this name already exists"
            );
        }

        DepartmentEntity department =
                DepartmentEntity.create(name);

        try {
            department =
                    departmentRepository
                            .saveAndFlush(
                                    department
                            );
        } catch (
                DataIntegrityViolationException exception
        ) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "DEPARTMENT_ALREADY_EXISTS",
                    "Department with this name already exists"
            );
        }

        return DepartmentResponse.from(
                department
        );
    }

    @Transactional
    public DepartmentResponse updateDepartment(
            Long id,
            UpdateDepartmentRequest request
    ) {
        DepartmentEntity department =
                departmentRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new ApiException(
                                        HttpStatus.NOT_FOUND,
                                        "RESOURCE_NOT_FOUND",
                                        "Department not found"
                                )
                        );

        if (
                request.name() == null
                        && request.isActive() == null
        ) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "At least one field must be provided"
            );
        }

        String name =
                department.getName();

        if (request.name() != null) {

            name =
                    normalizeName(
                            request.name()
                    );

            if (
                    departmentRepository
                            .existsByNameIgnoreCaseAndIdNot(
                                    name,
                                    id
                            )
            ) {
                throw new ApiException(
                        HttpStatus.CONFLICT,
                        "DEPARTMENT_ALREADY_EXISTS",
                        "Department with this name already exists"
                );
            }
        }

        boolean active =
                request.isActive() != null
                        ? request.isActive()
                        : department.isActive();

        department.update(
                name,
                active
        );

        try {
            departmentRepository.flush();
        } catch (
                DataIntegrityViolationException exception
        ) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "DEPARTMENT_ALREADY_EXISTS",
                    "Department with this name already exists"
            );
        }

        return DepartmentResponse.from(
                department
        );
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
                    "Department name must not be blank"
            );
        }

        return normalizedName;
    }
}