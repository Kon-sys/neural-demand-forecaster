package com.demandforecast.forecast.service;

import com.demandforecast.forecast.client.MlForecastClient;
import com.demandforecast.forecast.client.MlForecastRequest;
import com.demandforecast.forecast.client.MlForecastResponse;
import com.demandforecast.forecast.client.MlForecastValueResponse;
import com.demandforecast.forecast.client.MlHealthResponse;
import com.demandforecast.forecast.dto.CreateForecastRequest;
import com.demandforecast.forecast.dto.ForecastResponse;
import com.demandforecast.forecast.model.ForecastEntity;
import com.demandforecast.forecast.model.ForecastStatus;
import com.demandforecast.forecast.repository.ForecastRepository;
import com.demandforecast.forecast.repository.ForecastValueRepository;
import com.demandforecast.product.model.ProductEntity;
import com.demandforecast.product.repository.ProductRepository;
import com.demandforecast.sales.model.SalesEntity;
import com.demandforecast.sales.repository.SalesRepository;
import com.demandforecast.user.model.UserEntity;
import com.demandforecast.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ForecastServiceTest {

    private ForecastRepository forecastRepository;
    private ForecastValueRepository forecastValueRepository;
    private SalesRepository salesRepository;
    private ProductRepository productRepository;
    private UserRepository userRepository;
    private MlForecastClient mlForecastClient;

    private ForecastService service;

    @BeforeEach
    void setUp() {
        forecastRepository =
                mock(
                        ForecastRepository.class
                );

        forecastValueRepository =
                mock(
                        ForecastValueRepository.class
                );

        salesRepository =
                mock(
                        SalesRepository.class
                );

        productRepository =
                mock(
                        ProductRepository.class
                );

        userRepository =
                mock(
                        UserRepository.class
                );

        mlForecastClient =
                mock(
                        MlForecastClient.class
                );

        service =
                new ForecastService(
                        forecastRepository,
                        forecastValueRepository,
                        salesRepository,
                        productRepository,
                        userRepository,
                        mlForecastClient
                );
    }

    @Test
    void shouldGenerateThreeDayForecastWithSingleMlRequest() {
        long userId = 10L;
        long productId = 20L;

        UserEntity user =
                mock(
                        UserEntity.class
                );

        ProductEntity product =
                mock(
                        ProductEntity.class
                );

        when(
                user.getId()
        ).thenReturn(
                userId
        );

        when(
                product.getId()
        ).thenReturn(
                productId
        );

        when(
                product.getSku()
        ).thenReturn(
                "SKU-A"
        );

        when(
                userRepository.findById(
                        userId
                )
        ).thenReturn(
                Optional.of(
                        user
                )
        );

        when(
                productRepository.findById(
                        productId
                )
        ).thenReturn(
                Optional.of(
                        product
                )
        );

        LocalDate start =
                LocalDate.of(
                        2026,
                        1,
                        1
                );

        List<SalesEntity> sales =
                new ArrayList<>();

        for (
                int index = 0;
                index < 14;
                index++
        ) {
            sales.add(
                    SalesEntity.create(
                            product,
                            start.plusDays(
                                    index
                            ),
                            index + 1
                    )
            );
        }

        when(
                salesRepository
                        .findFirstByProduct_IdOrderBySaleDateAsc(
                                productId
                        )
        ).thenReturn(
                Optional.of(
                        sales.getFirst()
                )
        );

        when(
                salesRepository
                        .findFirstByProduct_IdOrderBySaleDateDesc(
                                productId
                        )
        ).thenReturn(
                Optional.of(
                        sales.getLast()
                )
        );

        when(
                salesRepository
                        .findByProduct_IdAndSaleDateBetweenOrderBySaleDateAsc(
                                eq(
                                        productId
                                ),
                                any(
                                        LocalDate.class
                                ),
                                any(
                                        LocalDate.class
                                )
                        )
        ).thenReturn(
                sales
        );

        when(
                mlForecastClient.health()
        ).thenReturn(
                new MlHealthResponse(
                        "ok",
                        true,
                        true,
                        "cpu",
                        14,
                        1,
                        "model-v1"
                )
        );

        when(
                mlForecastClient.forecast(
                        any(
                                MlForecastRequest.class
                        )
                )
        ).thenReturn(
                new MlForecastResponse(
                        "SKU-A",
                        "lstm",
                        "model-v1",
                        3,
                        14,
                        14,
                        List.of(
                                new MlForecastValueResponse(
                                        LocalDate.of(
                                                2026,
                                                1,
                                                15
                                        ),
                                        15.5
                                ),
                                new MlForecastValueResponse(
                                        LocalDate.of(
                                                2026,
                                                1,
                                                16
                                        ),
                                        16.5
                                ),
                                new MlForecastValueResponse(
                                        LocalDate.of(
                                                2026,
                                                1,
                                                17
                                        ),
                                        17.5
                                )
                        )
                )
        );

        when(
                forecastRepository.saveAndFlush(
                        any(
                                ForecastEntity.class
                        )
                )
        ).thenAnswer(
                invocation -> {
                    ForecastEntity forecast =
                            invocation
                                    .getArgument(
                                            0
                                    );

                    if (
                            forecast.getId()
                                    == null
                    ) {
                        ReflectionTestUtils.setField(
                                forecast,
                                "id",
                                100L
                        );
                    }

                    return forecast;
                }
        );

        when(
                forecastValueRepository.saveAll(
                        anyList()
                )
        ).thenAnswer(
                invocation ->
                        invocation.getArgument(
                                0
                        )
        );

        ForecastResponse response =
                service.create(
                        userId,
                        new CreateForecastRequest(
                                productId,
                                3
                        )
                );

        assertThat(
                response.id()
        ).isEqualTo(
                100L
        );

        assertThat(
                response.status()
        ).isEqualTo(
                ForecastStatus.COMPLETED
        );

        assertThat(
                response.modelVersion()
        ).isEqualTo(
                "model-v1"
        );

        assertThat(
                response.values()
        ).hasSize(
                3
        );

        assertThat(
                response
                        .values()
                        .get(0)
                        .date()
        ).isEqualTo(
                LocalDate.of(
                        2026,
                        1,
                        15
                )
        );

        assertThat(
                response
                        .values()
                        .get(0)
                        .predictedQuantity()
        ).isEqualByComparingTo(
                "15.5000"
        );

        assertThat(
                response
                        .values()
                        .get(2)
                        .predictedQuantity()
        ).isEqualByComparingTo(
                "17.5000"
        );

        ArgumentCaptor<MlForecastRequest> captor =
                ArgumentCaptor.forClass(
                        MlForecastRequest.class
                );

        verify(
                mlForecastClient,
                times(1)
        ).forecast(
                captor.capture()
        );

        MlForecastRequest mlRequest =
                captor.getValue();

        assertThat(
                mlRequest.productSku()
        ).isEqualTo(
                "SKU-A"
        );

        assertThat(
                mlRequest.forecastHorizon()
        ).isEqualTo(
                3
        );

        assertThat(
                mlRequest.lastObservationDate()
        ).isEqualTo(
                LocalDate.of(
                        2026,
                        1,
                        14
                )
        );

        assertThat(
                mlRequest.history()
        ).containsExactly(
                1.0,
                2.0,
                3.0,
                4.0,
                5.0,
                6.0,
                7.0,
                8.0,
                9.0,
                10.0,
                11.0,
                12.0,
                13.0,
                14.0
        );

        verify(
                forecastValueRepository
        ).saveAll(
                anyList()
        );
    }
}