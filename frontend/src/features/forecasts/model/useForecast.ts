import {
    useEffect,
    useState,
} from 'react'

import {
    forecastsApi,
} from '@/features/forecasts/api/forecasts.api'

import {
    mapForecastDto,
    type Forecast,
} from '@/entities/forecast/model/types'

interface ForecastRequestState {
    forecastId: string
    data: Forecast | null
    error: Error | null
}

export function useForecast(
    forecastId:
        | string
        | undefined,
) {
    const [
        requestState,
        setRequestState,
    ] = useState<ForecastRequestState>({
        forecastId: '',
        data: null,
        error: null,
    })

    useEffect(() => {
        if (!forecastId) {
            return
        }

        const controller =
            new AbortController()

        const currentId =
            forecastId

        forecastsApi
            .getById(
                currentId,
                controller.signal,
            )
            .then(response => {
                if (
                    controller.signal
                        .aborted
                ) {
                    return
                }

                setRequestState({
                    forecastId:
                    currentId,

                    data:
                        mapForecastDto(
                            response,
                        ),

                    error: null,
                })
            })
            .catch(reason => {
                if (
                    controller.signal
                        .aborted
                ) {
                    return
                }

                const normalized =
                    reason instanceof Error
                        ? reason
                        : new Error(
                            'Не удалось загрузить прогноз',
                        )

                setRequestState({
                    forecastId:
                    currentId,

                    data: null,

                    error:
                    normalized,
                })
            })

        return () => {
            controller.abort()
        }
    }, [
        forecastId,
    ])

    if (!forecastId) {
        return {
            forecast: null,
            loading: false,
            error: null,
        }
    }

    const settled =
        requestState
            .forecastId
        === forecastId

    return {
        forecast:
            settled
                ? requestState.data
                : null,

        loading:
            !settled,

        error:
            settled
                ? requestState.error
                : null,
    }
}