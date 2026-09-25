import {
    useState,
} from 'react'

import {
    forecastsApi,
} from '@/features/forecasts/api/forecasts.api'

import {
    mapForecastDto,
    type CreateForecastInput,
    type Forecast,
} from '@/entities/forecast/model/types'

export function useCreateForecast() {
    const [
        loading,
        setLoading,
    ] = useState(false)

    const [
        error,
        setError,
    ] = useState<Error | null>(
        null,
    )

    async function createForecast(
        input: CreateForecastInput,
    ): Promise<Forecast> {
        setLoading(true)
        setError(null)

        try {
            const response =
                await forecastsApi.create(
                    input,
                )

            return mapForecastDto(
                response,
            )
        } catch (reason) {
            const normalized =
                reason instanceof Error
                    ? reason
                    : new Error(
                        'Не удалось построить прогноз',
                    )

            setError(
                normalized,
            )

            throw normalized
        } finally {
            setLoading(false)
        }
    }

    function reset() {
        setError(null)
        setLoading(false)
    }

    return {
        loading,
        error,

        createForecast,
        reset,
    }
}