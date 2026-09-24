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
                        + server.getAddress().getPort();
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void shouldCallMlHealthAndPredictionEndpoints() {
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
                "/predict",
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
                              "prediction": 15.75,
                              "model": "lstm",
                              "model_version": "model-v1",
                              "window_size": 14,
                              "history_points_used": 14,
                              "forecast_date": "2026-01-15"
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
        ).isEqualTo("ok");

        assertThat(
                health.modelLoaded()
        ).isTrue();

        assertThat(
                health.scalersLoaded()
        ).isTrue();

        assertThat(
                health.windowSize()
        ).isEqualTo(14);

        assertThat(
                health.activeModelVersion()
        ).isEqualTo(
                "model-v1"
        );

        MlPredictResponse prediction =
                client.predict(
                        new MlPredictRequest(
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
                                LocalDate.of(
                                        2026,
                                        1,
                                        14
                                )
                        )
                );

        assertThat(
                prediction.productSku()
        ).isEqualTo(
                "SKU-A"
        );

        assertThat(
                prediction.prediction()
        ).isEqualTo(
                15.75
        );

        assertThat(
                prediction.modelVersion()
        ).isEqualTo(
                "model-v1"
        );

        assertThat(
                prediction.windowSize()
        ).isEqualTo(14);

        assertThat(
                prediction.forecastDate()
        ).isEqualTo(
                LocalDate.of(
                        2026,
                        1,
                        15
                )
        );

        assertThat(
                requestBody.get()
        ).contains(
                "\"product_sku\":\"SKU-A\""
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
                "/predict",
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
                        client.predict(
                                new MlPredictRequest(
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
                            ).isEqualTo(503);

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
                        .baseUrl(baseUrl)
                        .build();

        return new MlForecastClient(
                restClient
        );
    }
}