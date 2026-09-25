package com.demandforecast.forecast.service;

import com.demandforecast.common.error.ApiException;
import com.demandforecast.forecast.dto.ForecastHistoryPageResponse;
import com.demandforecast.forecast.model.ForecastEntity;
import com.demandforecast.forecast.model.ForecastStatus;
import com.demandforecast.forecast.repository.ForecastRepository;
import com.demandforecast.product.model.ProductEntity;
import com.demandforecast.user.model.UserEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ForecastQueryServiceTest {

    private ForecastRepository forecastRepository;
    private ForecastQueryService service;

    @BeforeEach
    void setUp() {
        forecastRepository =
                mock(ForecastRepository.class);

        service =
                new ForecastQueryService(
                        forecastRepository
                );
    }

    @Test
    void shouldReturnPagedForecastHistory() {
        UserEntity user =
                mock(UserEntity.class);

        ProductEntity product =
                mock(ProductEntity.class);

        when(user.getId())
                .thenReturn(
                        10L
                );

        when(product.getId())
                .thenReturn(
                        20L
                );

        when(product.getSku())
                .thenReturn(
                        "SKU-A"
                );

        when(product.getName())
                .thenReturn(
                        "Тестовый товар"
                );

        ForecastEntity forecast =
                ForecastEntity.create(
                        user,
                        product,
                        7,
                        "bootstrap"
                );

        ReflectionTestUtils.setField(
                forecast,
                "id",
                100L
        );

        ReflectionTestUtils.setField(
                forecast,
                "status",
                ForecastStatus.COMPLETED
        );

        ReflectionTestUtils.setField(
                forecast,
                "createdAt",
                OffsetDateTime.of(
                        2026,
                        9,
                        24,
                        18,
                        0,
                        0,
                        0,
                        ZoneOffset.UTC
                )
        );

        ReflectionTestUtils.setField(
                forecast,
                "completedAt",
                OffsetDateTime.of(
                        2026,
                        9,
                        24,
                        18,
                        0,
                        2,
                        0,
                        ZoneOffset.UTC
                )
        );

        Page<ForecastEntity> result =
                new PageImpl<>(
                        List.of(
                                forecast
                        )
                );

        when(
                forecastRepository.findAll(
                        any(
                                Specification.class
                        ),
                        any(
                                Pageable.class
                        )
                )
        ).thenReturn(
                result
        );

        ForecastHistoryPageResponse response =
                service.getHistory(
                        10L,
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

        assertThat(
                response.items()
        ).hasSize(
                1
        );

        assertThat(
                response.items()
                        .getFirst()
                        .id()
        ).isEqualTo(
                100L
        );

        assertThat(
                response.items()
                        .getFirst()
                        .productId()
        ).isEqualTo(
                20L
        );

        assertThat(
                response.items()
                        .getFirst()
                        .productSku()
        ).isEqualTo(
                "SKU-A"
        );

        assertThat(
                response.items()
                        .getFirst()
                        .productName()
        ).isEqualTo(
                "Тестовый товар"
        );

        assertThat(
                response.items()
                        .getFirst()
                        .forecastHorizon()
        ).isEqualTo(
                7
        );

        assertThat(
                response.items()
                        .getFirst()
                        .status()
        ).isEqualTo(
                ForecastStatus.COMPLETED
        );

        verify(
                forecastRepository
        ).findAll(
                any(
                        Specification.class
                ),
                any(
                        Pageable.class
                )
        );
    }

    @Test
    void shouldRejectInvalidDateRange() {
        assertThatThrownBy(
                () ->
                        service.getHistory(
                                10L,
                                null,
                                LocalDate.of(
                                        2026,
                                        9,
                                        30
                                ),
                                LocalDate.of(
                                        2026,
                                        9,
                                        1
                                ),
                                0,
                                20
                        )
        )
                .isInstanceOfSatisfying(
                        ApiException.class,
                        exception -> {
                            assertThat(
                                    exception
                                            .getStatus()
                                            .value()
                            ).isEqualTo(
                                    400
                            );

                            assertThat(
                                    exception
                                            .getCode()
                            ).isEqualTo(
                                    "INVALID_DATE_RANGE"
                            );
                        }
                );

        verifyNoInteractions(
                forecastRepository
        );
    }

    @Test
    void shouldRejectInvalidPagination() {
        assertThatThrownBy(
                () ->
                        service.getHistory(
                                10L,
                                null,
                                null,
                                null,
                                -1,
                                20
                        )
        )
                .isInstanceOfSatisfying(
                        ApiException.class,
                        exception ->
                                assertThat(
                                        exception
                                                .getCode()
                                ).isEqualTo(
                                        "INVALID_PAGE"
                                )
                );

        assertThatThrownBy(
                () ->
                        service.getHistory(
                                10L,
                                null,
                                null,
                                null,
                                0,
                                101
                        )
        )
                .isInstanceOfSatisfying(
                        ApiException.class,
                        exception ->
                                assertThat(
                                        exception
                                                .getCode()
                                ).isEqualTo(
                                        "INVALID_PAGE_SIZE"
                                )
                );

        verifyNoInteractions(
                forecastRepository
        );
    }
}