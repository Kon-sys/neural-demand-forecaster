import {
    api,
} from '@/shared/api/client'

import type {
    CreateForecastInput,
    CreateForecastRequestDto,
    ForecastDto,
    ForecastHistoryPageDto,
    ForecastHistoryParams,
} from '@/entities/forecast/model/types'

function toCreateRequest(
    input: CreateForecastInput,
): CreateForecastRequestDto {
    const productId =
        Number(
            input.productId,
        )

    if (
        !Number.isInteger(
            productId,
        )
        || productId <= 0
    ) {
        throw new Error(
            'Некорректный идентификатор товара',
        )
    }

    return {
        productId,

        forecastHorizon:
        input.forecastHorizon,
    }
}

function buildHistoryQuery(
    params: ForecastHistoryParams,
): string {
    const query =
        new URLSearchParams()

    if (params.productId) {
        const productId =
            Number(
                params.productId,
            )

        if (
            !Number.isInteger(
                productId,
            )
            || productId <= 0
        ) {
            throw new Error(
                'Некорректный идентификатор товара',
            )
        }

        query.set(
            'productId',
            String(
                productId,
            ),
        )
    }

    if (params.dateFrom) {
        query.set(
            'dateFrom',
            params.dateFrom,
        )
    }

    if (params.dateTo) {
        query.set(
            'dateTo',
            params.dateTo,
        )
    }

    query.set(
        'page',
        String(
            params.page
            ?? 0,
        ),
    )

    query.set(
        'size',
        String(
            params.size
            ?? 20,
        ),
    )

    return query.toString()
}

export const forecastsApi = {
    create(
        input: CreateForecastInput,
    ): Promise<ForecastDto> {
        return api.post<ForecastDto>(
            '/api/v1/forecasts',
            {
                json:
                    toCreateRequest(
                        input,
                    ),
            },
        )
    },

    getById(
        id: string,
        signal?: AbortSignal,
    ): Promise<ForecastDto> {
        return api.get<ForecastDto>(
            `/api/v1/forecasts/${id}`,
            {
                signal,
            },
        )
    },

    getHistory(
        params: ForecastHistoryParams = {},
        signal?: AbortSignal,
    ): Promise<ForecastHistoryPageDto> {
        const query =
            buildHistoryQuery(
                params,
            )

        return api.get<ForecastHistoryPageDto>(
            `/api/v1/forecasts?${query}`,
            {
                signal,
            },
        )
    },
}