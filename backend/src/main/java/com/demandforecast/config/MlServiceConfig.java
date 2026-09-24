package com.demandforecast.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
public class MlServiceConfig {

    @Bean("mlRestClient")
    public RestClient mlRestClient(
            @Value("${app.ml.base-url}")
            String baseUrl,

            @Value("${app.ml.connect-timeout}")
            Duration connectTimeout,

            @Value("${app.ml.read-timeout}")
            Duration readTimeout
    ) {
        HttpClient httpClient =
                HttpClient
                        .newBuilder()
                        .connectTimeout(
                                connectTimeout
                        )
                        .build();

        JdkClientHttpRequestFactory requestFactory =
                new JdkClientHttpRequestFactory(
                        httpClient
                );

        requestFactory.setReadTimeout(
                readTimeout
        );

        return RestClient
                .builder()
                .baseUrl(
                        baseUrl
                )
                .requestFactory(
                        requestFactory
                )
                .build();
    }
}