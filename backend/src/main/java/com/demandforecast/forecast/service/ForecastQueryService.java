package com.demandforecast.forecast.service;

import com.demandforecast.common.error.ApiException;
import com.demandforecast.forecast.dto.ForecastHistoryPageResponse;
import com.demandforecast.forecast.model.ForecastEntity;
import com.demandforecast.forecast.repository.ForecastRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Service
public class ForecastQueryService {

    private static final int MAX_PAGE_SIZE = 100;

    private final ForecastRepository forecastRepository;

    public ForecastQueryService(
            ForecastRepository forecastRepository
    ) {
        this.forecastRepository =
                forecastRepository;
    }

    @Transactional(readOnly = true)
    public ForecastHistoryPageResponse getHistory(
            Long userId,
            Long productId,
            LocalDate dateFrom,
            LocalDate dateTo,
            int page,
            int size
    ) {
        validatePagination(
                page,
                size
        );

        validateDateRange(
                dateFrom,
                dateTo
        );

        OffsetDateTime createdFrom =
                dateFrom == null
                        ? null
                        : dateFrom
                        .atStartOfDay()
                        .atOffset(
                                ZoneOffset.UTC
                        );

        OffsetDateTime createdToExclusive =
                dateTo == null
                        ? null
                        : dateTo
                        .plusDays(1)
                        .atStartOfDay()
                        .atOffset(
                                ZoneOffset.UTC
                        );

        Pageable pageable =
                PageRequest.of(
                        page,
                        size,
                        Sort.by(
                                Sort.Order.desc(
                                        "createdAt"
                                ),
                                Sort.Order.desc(
                                        "id"
                                )
                        )
                );

        Page<ForecastEntity> result =
                forecastRepository.findAll(
                        (root, query, criteriaBuilder) -> {
                            List<Predicate> predicates =
                                    new ArrayList<>();

                            predicates.add(
                                    criteriaBuilder.equal(
                                            root
                                                    .get("user")
                                                    .get("id"),
                                            userId
                                    )
                            );

                            if (productId != null) {
                                predicates.add(
                                        criteriaBuilder.equal(
                                                root
                                                        .get("product")
                                                        .get("id"),
                                                productId
                                        )
                                );
                            }

                            if (createdFrom != null) {
                                predicates.add(
                                        criteriaBuilder.greaterThanOrEqualTo(
                                                root.get(
                                                        "createdAt"
                                                ),
                                                createdFrom
                                        )
                                );
                            }

                            if (createdToExclusive != null) {
                                predicates.add(
                                        criteriaBuilder.lessThan(
                                                root.get(
                                                        "createdAt"
                                                ),
                                                createdToExclusive
                                        )
                                );
                            }

                            return criteriaBuilder.and(
                                    predicates.toArray(
                                            Predicate[]::new
                                    )
                            );
                        },
                        pageable
                );

        return ForecastHistoryPageResponse.from(
                result
        );
    }

    private void validatePagination(
            int page,
            int size
    ) {
        if (page < 0) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_PAGE",
                    "Page must be greater than or equal to zero"
            );
        }

        if (
                size < 1
                        || size > MAX_PAGE_SIZE
        ) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_PAGE_SIZE",
                    "Page size must be between 1 and "
                            + MAX_PAGE_SIZE
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
                        && dateFrom.isAfter(
                        dateTo
                )
        ) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_DATE_RANGE",
                    "dateFrom must not be later than dateTo"
            );
        }
    }
}