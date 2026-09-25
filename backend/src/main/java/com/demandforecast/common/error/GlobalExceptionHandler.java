package com.demandforecast.common.error;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log =
            LoggerFactory.getLogger(
                    GlobalExceptionHandler.class
            );

    private static final String AVATAR_PATH =
            "/api/v1/users/me/avatar";

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiErrorResponse> handleApiException(
            ApiException exception,
            HttpServletRequest request
    ) {
        HttpStatus status =
                exception.getStatus();

        ApiErrorResponse response =
                new ApiErrorResponse(
                        Instant.now(),
                        status.value(),
                        status.getReasonPhrase(),
                        exception.getCode(),
                        exception.getMessage(),
                        request.getRequestURI()
                );

        return ResponseEntity
                .status(status)
                .body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidationException(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        String message =
                exception
                        .getBindingResult()
                        .getFieldErrors()
                        .stream()
                        .findFirst()
                        .map(error ->
                                error.getField()
                                        + ": "
                                        + error.getDefaultMessage()
                        )
                        .orElse(
                                "Request validation failed"
                        );

        ApiErrorResponse response =
                new ApiErrorResponse(
                        Instant.now(),
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST
                                .getReasonPhrase(),
                        "VALIDATION_ERROR",
                        message,
                        request.getRequestURI()
                );

        return ResponseEntity
                .badRequest()
                .body(response);
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingRequestPart(
            MissingServletRequestPartException exception,
            HttpServletRequest request
    ) {
        if (isAvatarRequest(request)) {
            return buildError(
                    HttpStatus.BAD_REQUEST,
                    "AVATAR_INVALID_TYPE",
                    "Avatar image is required",
                    request
            );
        }

        return buildError(
                HttpStatus.BAD_REQUEST,
                "MISSING_MULTIPART_PART",
                "Required multipart field '"
                        + exception.getRequestPartName()
                        + "' is missing",
                request
        );
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleMaxUploadSizeExceeded(
            MaxUploadSizeExceededException exception,
            HttpServletRequest request
    ) {
        if (isAvatarRequest(request)) {
            return buildError(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "AVATAR_TOO_LARGE",
                    "Avatar image must not exceed 2 MB",
                    request
            );
        }

        return buildError(
                HttpStatus.PAYLOAD_TOO_LARGE,
                "FILE_TOO_LARGE",
                "Uploaded file exceeds the allowed size",
                request
        );
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<ApiErrorResponse> handleMultipartException(
            MultipartException exception,
            HttpServletRequest request
    ) {
        if (isAvatarRequest(request)) {
            return buildError(
                    HttpStatus.BAD_REQUEST,
                    "AVATAR_INVALID_TYPE",
                    "Avatar multipart request is invalid",
                    request
            );
        }

        return buildError(
                HttpStatus.BAD_REQUEST,
                "INVALID_MULTIPART_REQUEST",
                "Multipart request is invalid",
                request
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpectedException(
            Exception exception,
            HttpServletRequest request
    ) {
        log.error(
                "Unexpected error while processing {} {}: {} - {}",
                request.getMethod(),
                request.getRequestURI(),
                exception.getClass().getSimpleName(),
                exception.getMessage()
        );

        return buildError(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "INTERNAL_SERVER_ERROR",
                "An unexpected error occurred",
                request
        );
    }

    private ResponseEntity<ApiErrorResponse> buildError(
            HttpStatus status,
            String code,
            String message,
            HttpServletRequest request
    ) {
        ApiErrorResponse response =
                new ApiErrorResponse(
                        Instant.now(),
                        status.value(),
                        status.getReasonPhrase(),
                        code,
                        message,
                        request.getRequestURI()
                );

        return ResponseEntity
                .status(status)
                .body(response);
    }

    private boolean isAvatarRequest(
            HttpServletRequest request
    ) {
        return AVATAR_PATH.equals(
                request.getRequestURI()
        );
    }
}