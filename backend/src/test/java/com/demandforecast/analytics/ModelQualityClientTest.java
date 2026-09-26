package com.demandforecast.analytics;

import com.demandforecast.common.error.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class ModelQualityClientTest {
    @Test void mapsRealFrozenBundle() throws Exception {
        var builder = RestClient.builder().baseUrl("http://ml");
        var server = MockRestServiceServer.bindTo(builder).build();
        var json = Files.readString(Path.of("../ml-service/evaluation/kp24-v1.json"));
        server.expect(requestTo("http://ml/analytics/model-quality")).andRespond(withSuccess(json, MediaType.APPLICATION_JSON));
        var response = new ModelQualityClient(builder.build()).get();
        assertThat(response.observations()).isEqualTo(2100);
        assertThat(response.daily()).hasSize(7);
        assertThat(response.metrics().get(1).mae()).isCloseTo(0.6907, within(0.00005));
        server.verify();
    }

    @Test void unavailableMlIsControlled() {
        var builder = RestClient.builder().baseUrl("http://ml");
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://ml/analytics/model-quality")).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        assertThatThrownBy(() -> new ModelQualityClient(builder.build()).get()).isInstanceOf(ApiException.class)
                .hasMessage("Model evaluation is unavailable");
    }

    @Test void invalidSchemaIsControlled() {
        var builder = RestClient.builder().baseUrl("http://ml");
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://ml/analytics/model-quality")).andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> new ModelQualityClient(builder.build()).get()).isInstanceOf(ApiException.class);
    }
}
