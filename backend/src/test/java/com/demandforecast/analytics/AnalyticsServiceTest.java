package com.demandforecast.analytics;

import com.demandforecast.common.error.ApiException;
import com.demandforecast.forecast.dto.ForecastResponse;
import com.demandforecast.forecast.dto.ForecastValueResponse;
import com.demandforecast.forecast.service.ForecastService;
import com.demandforecast.product.repository.ProductRepository;
import com.demandforecast.sales.model.SalesEntity;
import com.demandforecast.sales.repository.SalesRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AnalyticsServiceTest {
    private final ForecastService forecasts = mock(ForecastService.class);
    private final SalesRepository sales = mock(SalesRepository.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final AnalyticsService service = new AnalyticsService(forecasts, sales, products);
    private final LocalDate end = LocalDate.of(2026, 9, 20);

    private void forecast() {
        var forecast = mock(ForecastResponse.class);
        when(forecast.productId()).thenReturn(9L);
        when(forecast.forecastHorizon()).thenReturn(3);
        when(forecast.values()).thenReturn(List.of(new ForecastValueResponse(end.plusDays(1), BigDecimal.TEN)));
        when(forecasts.getById(7L, 8L)).thenReturn(forecast);
    }

    @Test void comparesExactlyPreviousCalendarDaysAndBoundsHistory() {
        forecast();
        when(sales.findByProduct_IdAndSaleDateBetweenOrderBySaleDateAsc(9L, end.minusDays(29), end))
                .thenReturn(IntStream.range(0, 3).mapToObj(i -> SalesEntity.create(null, end.minusDays(2 - i), i + 1)).toList());
        var result = service.overview(7L, 8L, 30);
        assertThat(result.previousTotal()).isEqualByComparingTo("6");
        assertThat(result.previousDays()).isEqualTo(3);
        assertThat(result.history()).hasSize(3);
        verify(forecasts).getById(7L, 8L);
    }

    @Test void gapsAreNotInventedAsZeroActuals() {
        forecast();
        when(sales.findByProduct_IdAndSaleDateBetweenOrderBySaleDateAsc(9L, end.minusDays(59), end))
                .thenReturn(List.of(SalesEntity.create(null, end, 0)));
        var result = service.overview(7L, 8L, 60);
        assertThat(result.previousTotal()).isNull();
        assertThat(result.previousObservations()).isEqualTo(1);
        assertThat(result.history()).hasSize(1);
    }

    @Test void deniesAnotherUsersForecastBeforeReadingSales() {
        when(forecasts.getById(7L, 8L)).thenThrow(new ApiException(HttpStatus.NOT_FOUND, "FORECAST_NOT_FOUND", "Not found"));
        assertThatThrownBy(() -> service.overview(7L, 8L, 30)).isInstanceOf(ApiException.class);
        verifyNoInteractions(sales);
    }

    @Test void rejectsUnsupportedHistoryPeriod() {
        assertThatThrownBy(() -> service.overview(7L, 8L, 10000)).isInstanceOf(ApiException.class);
        verifyNoInteractions(forecasts, sales);
    }

    @Test void rejectsUnknownProduct() {
        assertThatThrownBy(() -> service.seasonality(9L)).isInstanceOf(ApiException.class);
        verifyNoInteractions(sales);
    }

    @Test void emptyProductHistoryHasNoSeasonality() {
        when(products.existsById(9L)).thenReturn(true);
        when(sales.findFirstByProduct_IdOrderBySaleDateDesc(9L)).thenReturn(Optional.empty());
        var result = service.seasonality(9L);
        assertThat(result.coverage().observationCount()).isZero();
        assertThat(result.weekdayAvailable()).isFalse();
        assertThat(result.monthlyAvailable()).isFalse();
    }

    @Test void sevenDaysAreInsufficientAndQueryIsBounded() {
        var result = seasonality(7);
        assertThat(result.coverage().calendarDays()).isEqualTo(7);
        assertThat(result.weekdayAvailable()).isFalse();
        assertThat(result.monthlyAvailable()).isFalse();
        verify(sales).findByProduct_IdAndSaleDateBetweenOrderBySaleDateAsc(9L, end.minusDays(365), end);
    }

    @Test void repeatedWeekdaysEnableWeeklyProfile() {
        var result = seasonality(28);
        assertThat(result.weekdayAvailable()).isTrue();
        assertThat(result.weekdays()).allSatisfy(b -> {
            assertThat(b.observations()).isEqualTo(4);
            assertThat(b.average()).isEqualTo(10);
        });
        assertThat(result.monthlyAvailable()).isFalse();
    }

    @Test void distributedMonthsEnableMonthlyComparison() {
        assertThat(seasonality(100).monthlyAvailable()).isTrue();
    }

    private AnalyticsService.Seasonality seasonality(int count) {
        when(products.existsById(9L)).thenReturn(true);
        var rows = IntStream.range(0, count).mapToObj(i -> SalesEntity.create(null, end.minusDays(count - i - 1L), 10)).toList();
        when(sales.findFirstByProduct_IdOrderBySaleDateDesc(9L)).thenReturn(Optional.of(rows.getLast()));
        when(sales.findByProduct_IdAndSaleDateBetweenOrderBySaleDateAsc(9L, end.minusDays(365), end)).thenReturn(rows);
        return service.seasonality(9L);
    }
}
