package com.demandforecast.user.controller;

import com.demandforecast.auth.dto.MeResponse;
import com.demandforecast.auth.security.AuthenticatedUser;
import com.demandforecast.user.dto.UpdateProfileRequest;
import com.demandforecast.user.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/me")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(
            ProfileService profileService
    ) {
        this.profileService = profileService;
    }

    @PatchMapping
    public ResponseEntity<MeResponse> updateProfile(
            @AuthenticationPrincipal
            AuthenticatedUser principal,

            @Valid
            @RequestBody
            UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(
                profileService.updateProfile(
                        principal,
                        request
                )
        );
    }
}