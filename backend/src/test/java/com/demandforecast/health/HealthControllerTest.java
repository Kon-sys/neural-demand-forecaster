package com.demandforecast.health;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class HealthControllerTest {

    private final HealthController controller = new HealthController();

    @Test
    void shouldReturnUpStatus() {
        var response = controller.health();

        assertEquals(HttpStatus.OK, response.getStatusCode());

        Map<String, String> body = response.getBody();

        assertNotNull(body);
        assertEquals("UP", body.get("status"));
        assertEquals(
                "demand-forecast-backend",
                body.get("service")
        );
    }
}