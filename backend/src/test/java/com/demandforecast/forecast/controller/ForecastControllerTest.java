package com.demandforecast.forecast.controller;

import com.demandforecast.forecast.dto.CreateForecastRequest;
import com.demandforecast.forecast.dto.ForecastResponse;
import com.demandforecast.forecast.dto.ForecastValueResponse;
import com.demandforecast.forecast.model.ForecastStatus;
import com.demandforecast.forecast.service.ForecastService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ForecastControllerTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldCreateForecastForAuthenticatedUser()
            throws Exception {

        ForecastService forecastService =
                mock(ForecastService.class);

        ForecastController controller =
                new ForecastController(
                        forecastService
                );

        MockMvc mockMvc =
                MockMvcBuilders
                        .standaloneSetup(
                                controller
                        )
                        .setCustomArgumentResolvers(
                                new AuthenticationPrincipalArgumentResolver()
                        )
                        .build();

        TestPrincipal principal =
                new TestPrincipal(
                        77L
                );

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        List.of()
                );

        SecurityContextHolder
                .getContext()
                .setAuthentication(
                        authentication
                );

        OffsetDateTime createdAt =
                OffsetDateTime.of(
                        2026,
                        9,
                        24,
                        17,
                        0,
                        0,
                        0,
                        ZoneOffset.UTC
                );

        ForecastResponse response =
                new ForecastResponse(
                        100L,
                        77L,
                        20L,
                        "SKU-A",
                        3,
                        "model-v1",
                        ForecastStatus.COMPLETED,
                        null,
                        null,
                        null,
                        createdAt,
                        createdAt,
                        createdAt,
                        null,
                        List.of(
                                new ForecastValueResponse(
                                        LocalDate.of(
                                                2026,
                                                1,
                                                15
                                        ),
                                        new BigDecimal(
                                                "12.5000"
                                        )
                                ),
                                new ForecastValueResponse(
                                        LocalDate.of(
                                                2026,
                                                1,
                                                16
                                        ),
                                        new BigDecimal(
                                                "13.2500"
                                        )
                                ),
                                new ForecastValueResponse(
                                        LocalDate.of(
                                                2026,
                                                1,
                                                17
                                        ),
                                        new BigDecimal(
                                                "14.0000"
                                        )
                                )
                        )
                );

        when(
                forecastService.create(
                        77L,
                        new CreateForecastRequest(
                                20L,
                                3
                        )
                )
        ).thenReturn(
                response
        );

        mockMvc.perform(
                        post(
                                "/api/v1/forecasts"
                        )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "productId": 20,
                                          "forecastHorizon": 3
                                        }
                                        """
                                )
                )
                .andExpect(
                        status().isCreated()
                )
                .andExpect(
                        jsonPath("$.id")
                                .value(100)
                )
                .andExpect(
                        jsonPath("$.userId")
                                .value(77)
                )
                .andExpect(
                        jsonPath("$.productId")
                                .value(20)
                )
                .andExpect(
                        jsonPath("$.productSku")
                                .value("SKU-A")
                )
                .andExpect(
                        jsonPath("$.forecastHorizon")
                                .value(3)
                )
                .andExpect(
                        jsonPath("$.modelVersion")
                                .value("model-v1")
                )
                .andExpect(
                        jsonPath("$.status")
                                .value("COMPLETED")
                )
                .andExpect(
                        jsonPath("$.values.length()")
                                .value(3)
                )
                .andExpect(
                        jsonPath(
                                "$.values[0].date"
                        ).value(
                                "2026-01-15"
                        )
                )
                .andExpect(
                        jsonPath(
                                "$.values[0].predictedQuantity"
                        ).value(
                                12.5
                        )
                );

        verify(
                forecastService
        ).create(
                77L,
                new CreateForecastRequest(
                        20L,
                        3
                )
        );
    }

    private static final class TestPrincipal {

        private final Long id;

        private TestPrincipal(
                Long id
        ) {
            this.id = id;
        }

        public Long getId() {
            return id;
        }
    }
}