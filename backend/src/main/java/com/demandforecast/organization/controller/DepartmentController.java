package com.demandforecast.organization.controller;

import com.demandforecast.organization.dto.CreateDepartmentRequest;
import com.demandforecast.organization.dto.DepartmentResponse;
import com.demandforecast.organization.dto.UpdateDepartmentRequest;
import com.demandforecast.organization.service.DepartmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(
            DepartmentService departmentService
    ) {
        this.departmentService =
                departmentService;
    }

    @GetMapping
    public ResponseEntity<List<DepartmentResponse>> getDepartments(
            @RequestParam(required = false)
            Boolean active,

            @RequestParam(required = false)
            String search
    ) {
        return ResponseEntity.ok(
                departmentService.getDepartments(
                        active,
                        search
                )
        );
    }

    @PostMapping
    public ResponseEntity<DepartmentResponse> createDepartment(
            @Valid
            @RequestBody
            CreateDepartmentRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        departmentService
                                .createDepartment(
                                        request
                                )
                );
    }

    @PatchMapping("/{id}")
    public ResponseEntity<DepartmentResponse> updateDepartment(
            @PathVariable
            Long id,

            @Valid
            @RequestBody
            UpdateDepartmentRequest request
    ) {
        return ResponseEntity.ok(
                departmentService
                        .updateDepartment(
                                id,
                                request
                        )
        );
    }
}