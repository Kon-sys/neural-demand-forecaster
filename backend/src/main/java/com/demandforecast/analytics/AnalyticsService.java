package com.demandforecast.analytics;

import com.demandforecast.common.error.ApiException;
import com.demandforecast.forecast.dto.ForecastResponse;
import com.demandforecast.forecast.service.ForecastService;
import com.demandforecast.product.repository.ProductRepository;
import com.demandforecast.sales.repository.SalesRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;

@Service
@Transactional(readOnly = true)
public class AnalyticsService {
    public record Point(LocalDate date, BigDecimal value) {}
    public record Overview(List<Point> history, LocalDate requestedFrom, LocalDate requestedTo,
                           int previousDays, int previousObservations, BigDecimal previousTotal) {}
    public record Coverage(LocalDate minDate, LocalDate maxDate, long calendarDays,
                           int observationCount, long weeks, long months) {}
    public record Bucket(String label, int observations, double average) {}
    public record Seasonality(Coverage coverage, boolean weekdayAvailable, boolean monthlyAvailable,
                              List<Bucket> weekdays, List<Bucket> months) {}

    private final ForecastService forecasts;
    private final SalesRepository sales;
    private final ProductRepository products;

    public AnalyticsService(ForecastService forecasts, SalesRepository sales, ProductRepository products) {
        this.forecasts = forecasts;
        this.sales = sales;
        this.products = products;
    }

    public Overview overview(Long userId, Long forecastId, int historyDays) {
        if (!Set.of(30, 60, 90).contains(historyDays)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_HISTORY_PERIOD", "History must be 30, 60 or 90 days");
        }
        // Reuse owner-scoped detail lookup: knowing another user's forecast ID grants no access.
        ForecastResponse forecast = forecasts.getById(userId, forecastId);
        if (forecast.values().isEmpty()) return new Overview(List.of(), null, null, 0, 0, null);
        LocalDate end = forecast.values().getFirst().date().minusDays(1);
        LocalDate from = end.minusDays(historyDays - 1L);
        int horizon = forecast.forecastHorizon();
        LocalDate previousFrom = end.minusDays(horizon - 1L);
        LocalDate queryFrom = from.isBefore(previousFrom) ? from : previousFrom;
        var rows = sales.findByProduct_IdAndSaleDateBetweenOrderBySaleDateAsc(forecast.productId(), queryFrom, end);
        var history = rows.stream().filter(s -> !s.getSaleDate().isBefore(from))
                .map(s -> new Point(s.getSaleDate(), new BigDecimal(s.getQuantity().toString()))).toList();
        var previous = rows.stream().filter(s -> !s.getSaleDate().isBefore(previousFrom)).toList();
        // Missing rows are unknown observations here, not invented actual sales.
        BigDecimal total = previous.size() == horizon ? previous.stream()
                .map(s -> new BigDecimal(s.getQuantity().toString())).reduce(BigDecimal.ZERO, BigDecimal::add) : null;
        return new Overview(history, from, end, horizon, previous.size(), total);
    }

    public Seasonality seasonality(Long productId) {
        if (!products.existsById(productId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found");
        }
        var last = sales.findFirstByProduct_IdOrderBySaleDateDesc(productId);
        if (last.isEmpty()) return new Seasonality(new Coverage(null, null, 0, 0, 0, 0), false, false, List.of(), List.of());
        // Bounded product series, at most 366 daily rows; never load an unbounded raw history.
        LocalDate end = last.get().getSaleDate();
        var rows = sales.findByProduct_IdAndSaleDateBetweenOrderBySaleDateAsc(productId, end.minusDays(365), end);
        LocalDate start = rows.getFirst().getSaleDate();
        long days = ChronoUnit.DAYS.between(start, end) + 1;
        long months = rows.stream().map(s -> YearMonth.from(s.getSaleDate())).distinct().count();
        var weekdayBuckets = IntStream.rangeClosed(1, 7).mapToObj(day -> {
            var group = rows.stream().filter(s -> s.getSaleDate().getDayOfWeek().getValue() == day).toList();
            return new Bucket(Integer.toString(day), group.size(), group.stream().mapToDouble(s -> s.getQuantity().doubleValue()).average().orElse(0));
        }).toList();
        var monthBuckets = rows.stream().map(s -> YearMonth.from(s.getSaleDate())).distinct().sorted().map(month -> {
            var group = rows.stream().filter(s -> YearMonth.from(s.getSaleDate()).equals(month)).toList();
            return new Bucket(month.toString(), group.size(), group.stream().mapToDouble(s -> s.getQuantity().doubleValue()).average().orElse(0));
        }).toList();
        boolean weekly = days >= 28 && weekdayBuckets.stream().allMatch(b -> b.observations() >= 4);
        boolean monthly = months >= 3 && monthBuckets.stream().filter(b -> b.observations() >= 20).count() >= 3;
        return new Seasonality(new Coverage(start, end, days, rows.size(), days / 7, months), weekly, monthly,
                weekdayBuckets, monthBuckets);
    }
}
