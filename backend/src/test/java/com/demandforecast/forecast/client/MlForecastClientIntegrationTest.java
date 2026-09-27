package com.demandforecast.forecast.client;

import com.demandforecast.common.error.ApiException;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MlForecastClientIntegrationTest {

    private HttpServer server;
    private String baseUrl;

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(
                new InetSocketAddress(
                        "127.0.0.1",
                        0
                ),
                0
        );

        server.start();

        baseUrl =
                "http://127.0.0.1:"
                        + server
                        .getAddress()
                        .getPort();
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void shouldCallMlHealthAndForecastEndpoints() {
        AtomicReference<String> requestBody =
                new AtomicReference<>();

        server.createContext(
                "/health",
                exchange -> {
                    byte[] body =
                            """
                            {
                              "status": "ok",
                              "model_loaded": true,
                              "scalers_loaded": true,
                              "device": "cpu",
                              "window_size": 14,
                              "series_count": 5,
                              "active_model_version": "model-v1"
                            }
                            """
                                    .getBytes(
                                            StandardCharsets.UTF_8
                                    );

                    exchange
                            .getResponseHeaders()
                            .add(
                                    "Content-Type",
                                    "application/json"
                            );

                    exchange.sendResponseHeaders(
                            200,
                            body.length
                    );

                    exchange
                            .getResponseBody()
                            .write(body);

                    exchange.close();
                }
        );

        server.createContext(
                "/forecast",
                exchange -> {
                    requestBody.set(
                            new String(
                                    exchange
                                            .getRequestBody()
                                            .readAllBytes(),
                                    StandardCharsets.UTF_8
                            )
                    );

                    byte[] body =
                            """
                            {
                              "product_sku": "SKU-A",
                              "model": "lstm",
                              "model_version": "model-v1",
                              "forecast_horizon": 3,
                              "window_size": 14,
                              "history_points_used": 14,
                              "values": [
                                {
                                  "date": "2026-01-15",
                                  "prediction": 15.75
                                },
                                {
                                  "date": "2026-01-16",
                                  "prediction": 16.25
                                },
                                {
                                  "date": "2026-01-17",
                                  "prediction": 17.5
                                }
                              ]
                            }
                            """
                                    .getBytes(
                                            StandardCharsets.UTF_8
                                    );

                    exchange
                            .getResponseHeaders()
                            .add(
                                    "Content-Type",
                                    "application/json"
                            );

                    exchange.sendResponseHeaders(
                            200,
                            body.length
                    );

                    exchange
                            .getResponseBody()
                            .write(body);

                    exchange.close();
                }
        );

        MlForecastClient client =
                createClient();

        MlHealthResponse health =
                client.health();

        assertThat(
                health.status()
        ).isEqualTo(
                "ok"
        );

        assertThat(
                health.modelLoaded()
        ).isTrue();

        assertThat(
                health.scalersLoaded()
        ).isTrue();

        assertThat(
                health.windowSize()
        ).isEqualTo(
                14
        );

        assertThat(
                health.activeModelVersion()
        ).isEqualTo(
                "model-v1"
        );

        MlForecastResponse forecast =
                client.forecast(
                        new MlForecastRequest(
                                "SKU-A",
                                List.of(
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
                                ),
                                3,
                                LocalDate.of(
                                        2026,
                                        1,
                                        14
                                )
                        )
                );

        assertThat(
                forecast.productSku()
        ).isEqualTo(
                "SKU-A"
        );

        assertThat(
                forecast.modelVersion()
        ).isEqualTo(
                "model-v1"
        );

        assertThat(
                forecast.forecastHorizon()
        ).isEqualTo(
                3
        );

        assertThat(
                forecast.windowSize()
        ).isEqualTo(
                14
        );

        assertThat(
                forecast.values()
        ).hasSize(
                3
        );

        assertThat(
                forecast
                        .values()
                        .getFirst()
                        .date()
        ).isEqualTo(
                LocalDate.of(
                        2026,
                        1,
                        15
                )
        );

        assertThat(
                forecast
                        .values()
                        .getFirst()
                        .prediction()
        ).isEqualTo(
                15.75
        );

        assertThat(
                requestBody.get()
        ).contains(
                "\"product_sku\":\"SKU-A\""
        );

        assertThat(
                requestBody.get()
        ).contains(
                "\"forecast_horizon\":3"
        );

        assertThat(
                requestBody.get()
        ).contains(
                "\"last_observation_date\":\"2026-01-14\""
        );
    }

    @Test
    void shouldMapMlServiceUnavailableResponse() {
        server.createContext(
                "/forecast",
                exchange -> {
                    byte[] body =
                            """
                            {
                              "detail": "runtime unavailable"
                            }
                            """
                                    .getBytes(
                                            StandardCharsets.UTF_8
                                    );

                    exchange
                            .getResponseHeaders()
                            .add(
                                    "Content-Type",
                                    "application/json"
                            );

                    exchange.sendResponseHeaders(
                            503,
                            body.length
                    );

                    exchange
                            .getResponseBody()
                            .write(body);

                    exchange.close();
                }
        );

        MlForecastClient client =
                createClient();

        assertThatThrownBy(
                () ->
                        client.forecast(
                                new MlForecastRequest(
                                        "SKU-A",
                                        List.of(
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
                                        ),
                                        3,
                                        LocalDate.of(
                                                2026,
                                                1,
                                                14
                                        )
                                )
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
                                    503
                            );

                            assertThat(
                                    exception
                                            .getCode()
                            ).isEqualTo(
                                    "ML_SERVICE_UNAVAILABLE"
                            );
                        }
                );
    }

    private MlForecastClient createClient() {
        RestClient restClient =
                RestClient
                        .builder()
                        .baseUrl(
                                baseUrl
                        )
                        .build();

        return new MlForecastClient(
                restClient
        );
    }
}