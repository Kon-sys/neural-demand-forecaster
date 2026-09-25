import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'

import {
    salesApi,
} from '@/features/sales/api/sales.api'

import {
    mapSalesPageDto,
    type SalesPage,
} from '@/entities/sale/model/types'

interface UseSalesOptions {
    productId?: string
    dateFrom?: string
    dateTo?: string
    page: number
    size: number
    enabled?: boolean
}

interface SalesRequestState {
    key: string
    data: SalesPage
    error: Error | null
}

function emptyPage(
    page: number,
    size: number,
): SalesPage {
    return {
        items: [],
        page,
        size,
        totalElements: 0,
        totalPages: 0,
    }
}

export function useSales({
                             productId,
                             dateFrom,
                             dateTo,
                             page,
                             size,
                             enabled = true,
                         }: UseSalesOptions) {
    const [
        reloadVersion,
        setReloadVersion,
    ] = useState(0)

    const requestKey =
        useMemo(
            () =>
                [
                    productId ?? '',
                    dateFrom ?? '',
                    dateTo ?? '',
                    String(page),
                    String(size),
                    String(reloadVersion),
                ].join('|'),
            [
                productId,
                dateFrom,
                dateTo,
                page,
                size,
                reloadVersion,
            ],
        )

    const [
        requestState,
        setRequestState,
    ] = useState<SalesRequestState>(
        () => ({
            key: '',
            data:
                emptyPage(
                    page,
                    size,
                ),
            error: null,
        }),
    )

    useEffect(() => {
        if (!enabled) {
            return
        }

        const controller =
            new AbortController()

        const key =
            requestKey

        salesApi
            .getSales(
                {
                    productId,
                    dateFrom,
                    dateTo,
                    page,
                    size,
                },
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
                    key,
                    data:
                        mapSalesPageDto(
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

                const normalizedError =
                    reason instanceof Error
                        ? reason
                        : new Error(
                            'Не удалось загрузить продажи',
                        )

                setRequestState({
                    key,
                    data:
                        emptyPage(
                            page,
                            size,
                        ),
                    error:
                    normalizedError,
                })
            })

        return () => {
            controller.abort()
        }
    }, [
        enabled,
        requestKey,
        productId,
        dateFrom,
        dateTo,
        page,
        size,
    ])

    const reload =
        useCallback(
            () => {
                setReloadVersion(
                    version =>
                        version + 1,
                )
            },
            [],
        )

    if (!enabled) {
        return {
            data:
                emptyPage(
                    page,
                    size,
                ),
            loading: false,
            error: null,
            reload,
        }
    }

    const settled =
        requestState.key
        === requestKey

    return {
        data:
            settled
                ? requestState.data
                : emptyPage(
                    page,
                    size,
                ),

        loading:
            !settled,

        error:
            settled
                ? requestState.error
                : null,

        reload,
    }
}