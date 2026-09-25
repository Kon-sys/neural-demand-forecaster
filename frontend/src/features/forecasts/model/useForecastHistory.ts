import {
    useEffect,
    useState,
} from 'react'

import type {
    ForecastHistoryPage,
    ForecastHistoryParams,
} from '@/entities/forecast/model/types'

import {
    mapForecastHistoryPageDto,
} from '@/entities/forecast/model/types'

import {
    forecastsApi,
} from '@/features/forecasts/api/forecasts.api'

interface RequestState {
    key: string
    data: ForecastHistoryPage | null
    error: string | null
}

export function useForecastHistory(
    params: ForecastHistoryParams = {},
) {
    const productId =
        params.productId
        ?? ''

    const dateFrom =
        params.dateFrom
        ?? ''

    const dateTo =
        params.dateTo
        ?? ''

    const page =
        params.page
        ?? 0

    const size =
        params.size
        ?? 20

    const requestKey = [
        productId,
        dateFrom,
        dateTo,
        page,
        size,
    ].join(
        '|',
    )

    const [
        state,
        setState,
    ] = useState<RequestState>({
        key: '',
        data: null,
        error: null,
    })

    useEffect(
        () => {
            const controller =
                new AbortController()

            forecastsApi
                .getHistory(
                    {
                        productId:
                            productId
                            || undefined,

                        dateFrom:
                            dateFrom
                            || undefined,

                        dateTo:
                            dateTo
                            || undefined,

                        page,
                        size,
                    },
                    controller.signal,
                )
                .then(
                    response => {
                        if (
                            controller.signal
                                .aborted
                        ) {
                            return
                        }

                        setState({
                            key:
                            requestKey,

                            data:
                                mapForecastHistoryPageDto(
                                    response,
                                ),

                            error:
                                null,
                        })
                    },
                )
                .catch(
                    error => {
                        if (
                            controller.signal
                                .aborted
                        ) {
                            return
                        }

                        setState({
                            key:
                            requestKey,

                            data:
                                null,

                            error:
                                error
                                instanceof Error
                                    ? error.message
                                    : 'Не удалось загрузить историю прогнозов',
                        })
                    },
                )

            return () => {
                controller.abort()
            }
        },
        [
            dateFrom,
            dateTo,
            page,
            productId,
            requestKey,
            size,
        ],
    )

    const isCurrent =
        state.key
        === requestKey

    const data =
        isCurrent
            ? state.data
            : null

    return {
        data,

        forecasts:
            data?.items
            ?? [],

        loading:
            !isCurrent,

        error:
            isCurrent
                ? state.error
                : null,
    }
}