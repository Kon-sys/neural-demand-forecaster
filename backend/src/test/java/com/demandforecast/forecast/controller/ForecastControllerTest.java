package com.demandforecast.forecast.controller;

import com.demandforecast.forecast.dto.CreateForecastRequest;
import com.demandforecast.forecast.dto.ForecastHistoryItemResponse;
import com.demandforecast.forecast.dto.ForecastHistoryPageResponse;
import com.demandforecast.forecast.dto.ForecastResponse;
import com.demandforecast.forecast.dto.ForecastValueResponse;
import com.demandforecast.forecast.model.ForecastStatus;
import com.demandforecast.forecast.service.ForecastQueryService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

        ForecastQueryService forecastQueryService =
                mock(ForecastQueryService.class);

        ForecastController controller =
                new ForecastController(
                        forecastService,
                        forecastQueryService
                );

        MockMvc mockMvc =
                createMockMvc(
                        controller
                );

        authenticate(
                77L
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
                        "Product A",
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

    @Test
    void shouldReturnForecastHistoryForAuthenticatedUser()
            throws Exception {

        ForecastService forecastService =
                mock(ForecastService.class);

        ForecastQueryService forecastQueryService =
                mock(ForecastQueryService.class);

        ForecastController controller =
                new ForecastController(
                        forecastService,
                        forecastQueryService
                );

        MockMvc mockMvc =
                createMockMvc(
                        controller
                );

        authenticate(
                77L
        );

        OffsetDateTime createdAt =
                OffsetDateTime.of(
                        2026,
                        9,
                        24,
                        18,
                        30,
                        0,
                        0,
                        ZoneOffset.UTC
                );

        ForecastHistoryPageResponse response =
                new ForecastHistoryPageResponse(
                        List.of(
                                new ForecastHistoryItemResponse(
                                        501L,
                                        20L,
                                        "SKU-A",
                                        "Тестовый товар",
                                        7,
                                        "bootstrap",
                                        ForecastStatus.COMPLETED,
                                        createdAt,
                                        createdAt
                                )
                        ),
                        0,
                        20,
                        1L,
                        1
                );

        when(
                forecastQueryService.getHistory(
                        77L,
                        20L,
                        LocalDate.of(
                                2026,
                                9,
                                1
                        ),
                        LocalDate.of(
                                2026,
                                9,
                                30
                        ),
                        0,
                        20
                )
        ).thenReturn(
                response
        );

        mockMvc.perform(
                        get(
                                "/api/v1/forecasts"
                        )
                                .param(
                                        "productId",
                                        "20"
                                )
                                .param(
                                        "dateFrom",
                                        "2026-09-01"
                                )
                                .param(
                                        "dateTo",
                                        "2026-09-30"
                                )
                                .param(
                                        "page",
                                        "0"
                                )
                                .param(
                                        "size",
                                        "20"
                                )
                )
                .andExpect(
                        status().isOk()
                )
                .andExpect(
                        jsonPath("$.items.length()")
                                .value(1)
                )
                .andExpect(
                        jsonPath("$.items[0].id")
                                .value(501)
                )
                .andExpect(
                        jsonPath("$.items[0].productId")
                                .value(20)
                )
                .andExpect(
                        jsonPath("$.items[0].productSku")
                                .value("SKU-A")
                )
                .andExpect(
                        jsonPath("$.items[0].productName")
                                .value("Тестовый товар")
                )
                .andExpect(
                        jsonPath("$.items[0].forecastHorizon")
                                .value(7)
                )
                .andExpect(
                        jsonPath("$.items[0].modelVersion")
                                .value("bootstrap")
                )
                .andExpect(
                        jsonPath("$.items[0].status")
                                .value("COMPLETED")
                )
                .andExpect(
                        jsonPath("$.page")
                                .value(0)
                )
                .andExpect(
                        jsonPath("$.size")
                                .value(20)
                )
                .andExpect(
                        jsonPath("$.totalElements")
                                .value(1)
                )
                .andExpect(
                        jsonPath("$.totalPages")
                                .value(1)
                );

        verify(
                forecastQueryService
        ).getHistory(
                77L,
                20L,
                LocalDate.of(
                        2026,
                        9,
                        1
                ),
                LocalDate.of(
                        2026,
                        9,
                        30
                ),
                0,
                20
        );
    }

    private MockMvc createMockMvc(
            ForecastController controller
    ) {
        return MockMvcBuilders
                .standaloneSetup(
                        controller
                )
                .setCustomArgumentResolvers(
                        new AuthenticationPrincipalArgumentResolver()
                )
                .build();
    }

    private void authenticate(
            Long userId
    ) {
        TestPrincipal principal =
                new TestPrincipal(
                        userId
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