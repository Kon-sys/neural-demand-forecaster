package com.demandforecast.sales.service;

import com.demandforecast.common.error.ApiException;
import com.demandforecast.sales.dto.SaleResponse;
import com.demandforecast.sales.dto.SalesPageResponse;
import com.demandforecast.sales.model.SalesEntity;
import com.demandforecast.sales.repository.SalesRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@Transactional(readOnly = true)
public class SalesService {

    private final SalesRepository salesRepository;

    public SalesService(SalesRepository salesRepository) {
        this.salesRepository = salesRepository;
    }

    public SalesPageResponse getSales(
            Long productId,
            LocalDate dateFrom,
            LocalDate dateTo,
            int page,
            int size
    ) {
        validatePagination(page, size);
        validateDateRange(dateFrom, dateTo);

        Specification<SalesEntity> specification =
                (root, query, criteriaBuilder) ->
                        criteriaBuilder.conjunction();

        if (productId != null) {
            specification = specification.and(
                    (root, query, criteriaBuilder) ->
                            criteriaBuilder.equal(
                                    root.get("product").get("id"),
                                    productId
                            )
            );
        }

        if (dateFrom != null) {
            specification = specification.and(
                    (root, query, criteriaBuilder) ->
                            criteriaBuilder.greaterThanOrEqualTo(
                                    root.get("saleDate"),
                                    dateFrom
                            )
            );
        }

        if (dateTo != null) {
            specification = specification.and(
                    (root, query, criteriaBuilder) ->
                            criteriaBuilder.lessThanOrEqualTo(
                                    root.get("saleDate"),
                                    dateTo
                            )
            );
        }

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(
                        Sort.Order.desc("saleDate"),
                        Sort.Order.desc("id")
                )
        );

        Page<SaleResponse> result = salesRepository
                .findAll(specification, pageable)
                .map(SaleResponse::from);

        return SalesPageResponse.from(result);
    }

    private void validatePagination(
            int page,
            int size
    ) {
        if (page < 0) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_PAGE",
                    "Page must not be negative"
            );
        }

        if (size <= 0) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_PAGE_SIZE",
                    "Page size must be greater than zero"
            );
        }
    }

    private void validateDateRange(
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        if (
                dateFrom != null
                        && dateTo != null
                        && dateFrom.isAfter(dateTo)
        ) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_DATE_RANGE",
                    "dateFrom must not be after dateTo"
            );
        }
    }
}