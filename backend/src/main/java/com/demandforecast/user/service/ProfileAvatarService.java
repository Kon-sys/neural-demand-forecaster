package com.demandforecast.user.service;

import com.demandforecast.auth.security.AuthenticatedUser;
import com.demandforecast.common.error.ApiException;
import com.demandforecast.storage.CloudinaryStorageService;
import com.demandforecast.user.dto.AvatarResponse;
import com.demandforecast.user.model.UserEntity;
import com.demandforecast.user.model.UserStatus;
import com.demandforecast.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;

@Service
public class ProfileAvatarService {

    private static final long MAX_AVATAR_SIZE =
            2L * 1024L * 1024L;

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of(
                    "image/jpeg",
                    "image/png",
                    "image/webp"
            );

    private final UserRepository userRepository;
    private final CloudinaryStorageService storageService;

    public ProfileAvatarService(
            UserRepository userRepository,
            CloudinaryStorageService storageService
    ) {
        this.userRepository =
                userRepository;

        this.storageService =
                storageService;
    }

    @Transactional
    public AvatarResponse uploadAvatar(
            AuthenticatedUser principal,
            MultipartFile file
    ) {
        UserEntity user =
                findActiveUser(
                        principal
                );

        validateFile(
                file
        );

        byte[] content;

        try {
            content =
                    file.getBytes();

        } catch (IOException exception) {
            throw invalidAvatar(
                    "Unable to read uploaded image"
            );
        }

        String detectedContentType =
                detectContentType(
                        content
                );

        if (
                detectedContentType == null
                        || !ALLOWED_CONTENT_TYPES.contains(
                        detectedContentType
                )
        ) {
            throw invalidAvatar(
                    "Unsupported avatar image type"
            );
        }

        String declaredContentType =
                file.getContentType();

        if (
                declaredContentType == null
                        || !ALLOWED_CONTENT_TYPES.contains(
                        declaredContentType
                )
                        || !declaredContentType.equals(
                        detectedContentType
                )
        ) {
            throw invalidAvatar(
                    "Avatar MIME type does not match image content"
            );
        }

        String publicId =
                buildPublicId(
                        user.getId()
                );

        String avatarUrl =
                storageService.uploadImage(
                        content,
                        publicId
                );

        user.setAvatarUrl(
                avatarUrl
        );

        userRepository.flush();

        return new AvatarResponse(
                avatarUrl
        );
    }

    @Transactional
    public void deleteAvatar(
            AuthenticatedUser principal
    ) {
        UserEntity user =
                findActiveUser(
                        principal
                );

        if (user.getAvatarUrl() == null) {
            return;
        }

        storageService.deleteImage(
                buildPublicId(
                        user.getId()
                )
        );

        user.setAvatarUrl(
                null
        );

        userRepository.flush();
    }

    private UserEntity findActiveUser(
            AuthenticatedUser principal
    ) {
        UserEntity user =
                userRepository
                        .findById(
                                principal.id()
                        )
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

        return user;
    }

    private void validateFile(
            MultipartFile file
    ) {
        if (
                file == null
                        || file.isEmpty()
        ) {
            throw invalidAvatar(
                    "Avatar image is required"
            );
        }

        if (
                file.getSize()
                        > MAX_AVATAR_SIZE
        ) {
            throw new ApiException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "AVATAR_TOO_LARGE",
                    "Avatar image must not exceed 2 MB"
            );
        }
    }

    private String detectContentType(
            byte[] content
    ) {
        if (isJpeg(content)) {
            return "image/jpeg";
        }

        if (isPng(content)) {
            return "image/png";
        }

        if (isWebp(content)) {
            return "image/webp";
        }

        return null;
    }

    private boolean isJpeg(
            byte[] content
    ) {
        return content.length >= 3
                && (content[0] & 0xFF) == 0xFF
                && (content[1] & 0xFF) == 0xD8
                && (content[2] & 0xFF) == 0xFF;
    }

    private boolean isPng(
            byte[] content
    ) {
        return content.length >= 8
                && (content[0] & 0xFF) == 0x89
                && (content[1] & 0xFF) == 0x50
                && (content[2] & 0xFF) == 0x4E
                && (content[3] & 0xFF) == 0x47
                && (content[4] & 0xFF) == 0x0D
                && (content[5] & 0xFF) == 0x0A
                && (content[6] & 0xFF) == 0x1A
                && (content[7] & 0xFF) == 0x0A;
    }

    private boolean isWebp(
            byte[] content
    ) {
        return content.length >= 12
                && content[0] == 'R'
                && content[1] == 'I'
                && content[2] == 'F'
                && content[3] == 'F'
                && content[8] == 'W'
                && content[9] == 'E'
                && content[10] == 'B'
                && content[11] == 'P';
    }

    private String buildPublicId(
            Long userId
    ) {
        return "demand-forecast/users/"
                + userId
                + "/avatar";
    }

    private ApiException invalidAvatar(
            String message
    ) {
        return new ApiException(
                HttpStatus.BAD_REQUEST,
                "AVATAR_INVALID_TYPE",
                message
        );
    }
}