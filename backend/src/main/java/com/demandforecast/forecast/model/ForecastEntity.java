package com.demandforecast.forecast.model;

import com.demandforecast.product.model.ProductEntity;
import com.demandforecast.user.model.UserEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "forecasts")
public class ForecastEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "user_id",
            nullable = false
    )
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "product_id",
            nullable = false
    )
    private ProductEntity product;

    @Column(
            name = "forecast_horizon",
            nullable = false
    )
    private Integer forecastHorizon;

    @Column(
            name = "model_version",
            nullable = false,
            length = 100
    )
    private String modelVersion;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "status",
            nullable = false,
            length = 20
    )
    private ForecastStatus status;

    @Column(
            name = "mae",
            precision = 18,
            scale = 6
    )
    private BigDecimal mae;

    @Column(
            name = "rmse",
            precision = 18,
            scale = 6
    )
    private BigDecimal rmse;

    @Column(
            name = "mape",
            precision = 18,
            scale = 6
    )
    private BigDecimal mape;

    @Generated(event = EventType.INSERT)
    @Column(
            name = "created_at",
            nullable = false,
            insertable = false,
            updatable = false
    )
    private OffsetDateTime createdAt;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(
            name = "error_message",
            length = 1000
    )
    private String errorMessage;

    protected ForecastEntity() {
    }

    public static ForecastEntity create(
            UserEntity user,
            ProductEntity product,
            int forecastHorizon,
            String modelVersion
    ) {
        ForecastEntity forecast = new ForecastEntity();

        forecast.user = user;
        forecast.product = product;
        forecast.forecastHorizon = forecastHorizon;
        forecast.modelVersion = modelVersion;
        forecast.status = ForecastStatus.PENDING;

        return forecast;
    }

    public void markProcessing() {
        this.status = ForecastStatus.PROCESSING;
        this.startedAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.completedAt = null;
        this.errorMessage = null;
    }

    public void markCompleted(String modelVersion) {
        this.modelVersion = modelVersion;
        this.status = ForecastStatus.COMPLETED;
        this.completedAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.errorMessage = null;
    }

    public void markFailed(String message) {
        this.status = ForecastStatus.FAILED;
        this.completedAt = OffsetDateTime.now(ZoneOffset.UTC);

        if (message == null || message.isBlank()) {
            this.errorMessage = "Forecast generation failed";
            return;
        }

        this.errorMessage = message.length() <= 1000
                ? message
                : message.substring(0, 1000);
    }

    public Long getId() {
        return id;
    }

    public UserEntity getUser() {
        return user;
    }

    public ProductEntity getProduct() {
        return product;
    }

    public Integer getForecastHorizon() {
        return forecastHorizon;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public ForecastStatus getStatus() {
        return status;
    }

    public BigDecimal getMae() {
        return mae;
    }

    public BigDecimal getRmse() {
        return rmse;
    }

    public BigDecimal getMape() {
        return mape;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getStartedAt() {
        return startedAt;
    }

    public OffsetDateTime getCompletedAt() {
        return completedAt;
    }

    public String getErrorMessage() {
        return errorMessage;
    }
}