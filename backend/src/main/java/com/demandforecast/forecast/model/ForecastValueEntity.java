package com.demandforecast.forecast.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(
        name = "forecast_values",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "forecast_values_forecast_date_uq",
                        columnNames = {
                                "forecast_id",
                                "forecast_date"
                        }
                )
        }
)
public class ForecastValueEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "forecast_id",
            nullable = false
    )
    private ForecastEntity forecast;

    @Column(
            name = "forecast_date",
            nullable = false
    )
    private LocalDate forecastDate;

    @Column(
            name = "predicted_quantity",
            nullable = false,
            precision = 18,
            scale = 4
    )
    private BigDecimal predictedQuantity;

    protected ForecastValueEntity() {
    }

    public static ForecastValueEntity create(
            ForecastEntity forecast,
            LocalDate forecastDate,
            BigDecimal predictedQuantity
    ) {
        ForecastValueEntity value =
                new ForecastValueEntity();

        value.forecast = forecast;
        value.forecastDate = forecastDate;
        value.predictedQuantity = predictedQuantity;

        return value;
    }

    public Long getId() {
        return id;
    }

    public ForecastEntity getForecast() {
        return forecast;
    }

    public LocalDate getForecastDate() {
        return forecastDate;
    }

    public BigDecimal getPredictedQuantity() {
        return predictedQuantity;
    }
}