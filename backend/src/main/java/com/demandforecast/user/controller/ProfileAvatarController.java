package com.demandforecast.user.controller;

import com.demandforecast.auth.security.AuthenticatedUser;
import com.demandforecast.user.dto.AvatarResponse;
import com.demandforecast.user.service.ProfileAvatarService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/users/me/avatar")
public class ProfileAvatarController {

    private final ProfileAvatarService profileAvatarService;

    public ProfileAvatarController(
            ProfileAvatarService profileAvatarService
    ) {
        this.profileAvatarService =
                profileAvatarService;
    }

    @PostMapping(
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<AvatarResponse> uploadAvatar(
            @AuthenticationPrincipal
            AuthenticatedUser principal,

            @RequestPart(
                    value = "file",
                    required = false
            )
            MultipartFile file
    ) {
        return ResponseEntity.ok(
                profileAvatarService.uploadAvatar(
                        principal,
                        file
                )
        );
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAvatar(
            @AuthenticationPrincipal
            AuthenticatedUser principal
    ) {
        profileAvatarService.deleteAvatar(
                principal
        );

        return ResponseEntity
                .noContent()
                .build();
    }
}