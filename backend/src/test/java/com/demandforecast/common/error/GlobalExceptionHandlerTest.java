package com.demandforecast.common.error;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler =
            new GlobalExceptionHandler();

    @Test
    void shouldReturnInternalServerError() {
        MockHttpServletRequest request =
                new MockHttpServletRequest();

        request.setRequestURI("/api/v1/test");

        var response = handler.handleUnexpectedException(
                new RuntimeException("Test exception"),
                request
        );

        assertEquals(
                HttpStatus.INTERNAL_SERVER_ERROR,
                response.getStatusCode()
        );

        ApiErrorResponse body = response.getBody();

        assertNotNull(body);

        assertEquals(500, body.status());
        assertEquals(
                "Internal Server Error",
                body.error()
        );
        assertEquals(
                "INTERNAL_SERVER_ERROR",
                body.code()
        );
        assertEquals(
                "An unexpected error occurred",
                body.message()
        );
        assertEquals(
                "/api/v1/test",
                body.path()
        );

        assertNotNull(body.timestamp());
    }
}