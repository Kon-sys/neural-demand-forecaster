package com.demandforecast.user.controller;

import com.demandforecast.auth.security.AuthenticatedUser;
import com.demandforecast.user.dto.AdminUserPageResponse;
import com.demandforecast.user.dto.AdminUserResponse;
import com.demandforecast.user.dto.UpdateAdminUserRequest;
import com.demandforecast.user.model.UserRole;
import com.demandforecast.user.model.UserStatus;
import com.demandforecast.user.service.AdminUserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(
            AdminUserService adminUserService
    ) {
        this.adminUserService =
                adminUserService;
    }

    @GetMapping
    public ResponseEntity<AdminUserPageResponse> getUsers(
            @RequestParam(required = false)
            String search,

            @RequestParam(required = false)
            UserRole role,

            @RequestParam(required = false)
            UserStatus status,

            @RequestParam(required = false)
            Long departmentId,

            @RequestParam(required = false)
            Long positionId,

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "20")
            int size
    ) {
        return ResponseEntity.ok(
                adminUserService.getUsers(
                        search,
                        role,
                        status,
                        departmentId,
                        positionId,
                        page,
                        size
                )
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminUserResponse> getUser(
            @PathVariable
            Long id
    ) {
        return ResponseEntity.ok(
                adminUserService.getUser(
                        id
                )
        );
    }

    @PatchMapping("/{id}")
    public ResponseEntity<AdminUserResponse> updateUser(
            @AuthenticationPrincipal
            AuthenticatedUser principal,

            @PathVariable
            Long id,

            @RequestBody
            UpdateAdminUserRequest request
    ) {
        return ResponseEntity.ok(
                adminUserService.updateUser(
                        principal,
                        id,
                        request
                )
        );
    }
}