package com.demandforecast.analytics;

import java.time.LocalDate;
import java.util.List;

public record ModelQualityResponse(int schemaVersion, String source, String protocol,
        LocalDate testStart, LocalDate testEnd, int observations, int seriesCount,
        List<Metric> metrics, List<Daily> daily) {
    public record Metric(String model, double mae, double rmse, Double mape, int observations, int mapeObservations) {}
    public record Daily(LocalDate date, double actual, double movingAverage, double lstm,
                        double movingAverageMae, double lstmMae) {}
}
