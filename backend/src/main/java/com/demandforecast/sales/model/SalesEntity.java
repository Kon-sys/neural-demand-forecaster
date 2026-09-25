package com.demandforecast.sales.model;

import com.demandforecast.product.model.ProductEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(
        name = "sales",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "sales_product_date_uq",
                        columnNames = {"product_id", "sale_date"}
                )
        }
)
public class SalesEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "product_id",
            nullable = false
    )
    private ProductEntity product;

    @Column(
            name = "sale_date",
            nullable = false
    )
    private LocalDate saleDate;

    @Column(
            name = "quantity",
            nullable = false
    )
    private Integer quantity;

    @Generated(event = EventType.INSERT)
    @Column(
            name = "created_at",
            nullable = false,
            insertable = false,
            updatable = false
    )
    private OffsetDateTime createdAt;

    protected SalesEntity() {
    }

    public static SalesEntity create(
            ProductEntity product,
            LocalDate saleDate,
            Integer quantity
    ) {
        SalesEntity sale = new SalesEntity();

        sale.product = product;
        sale.saleDate = saleDate;
        sale.quantity = quantity;

        return sale;
    }

    public Long getId() {
        return id;
    }

    public ProductEntity getProduct() {
        return product;
    }

    public LocalDate getSaleDate() {
        return saleDate;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}