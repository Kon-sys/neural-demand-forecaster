package com.demandforecast.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.demandforecast.common.error.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class CloudinaryStorageService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    CloudinaryStorageService.class
            );

    private final Cloudinary cloudinary;

    public CloudinaryStorageService(
            Cloudinary cloudinary
    ) {
        this.cloudinary = cloudinary;
    }

    public String uploadImage(
            byte[] content,
            String publicId
    ) {
        try {
            Map<?, ?> result =
                    cloudinary
                            .uploader()
                            .upload(
                                    content,
                                    ObjectUtils.asMap(
                                            "resource_type",
                                            "image",
                                            "public_id",
                                            publicId,
                                            "overwrite",
                                            true,
                                            "invalidate",
                                            true
                                    )
                            );

            Object secureUrl =
                    result.get(
                            "secure_url"
                    );

            if (secureUrl == null) {
                throw new IllegalStateException(
                        "Cloudinary response does not contain secure_url"
                );
            }

            return secureUrl.toString();

        } catch (Exception exception) {

            log.error(
                    "Cloudinary upload failed: {} - {}",
                    exception.getClass().getSimpleName(),
                    exception.getMessage()
            );

            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "STORAGE_UNAVAILABLE",
                    "Image storage is temporarily unavailable"
            );
        }
    }

    public void deleteImage(
            String publicId
    ) {
        try {
            cloudinary
                    .uploader()
                    .destroy(
                            publicId,
                            ObjectUtils.asMap(
                                    "resource_type",
                                    "image",
                                    "invalidate",
                                    true
                            )
                    );

        } catch (Exception exception) {

            log.error(
                    "Cloudinary delete failed: {} - {}",
                    exception.getClass().getSimpleName(),
                    exception.getMessage()
            );

            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "STORAGE_UNAVAILABLE",
                    "Image storage is temporarily unavailable"
            );
        }
    }
}