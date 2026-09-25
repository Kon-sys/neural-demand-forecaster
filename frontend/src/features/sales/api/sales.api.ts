import {
    api,
} from '@/shared/api/client'

import type {
    CsvImportResponse,
    SalesPageDto,
} from '@/entities/sale/model/types'

export interface SalesQuery {
    productId?: string
    dateFrom?: string
    dateTo?: string
    page: number
    size: number
}

export const salesApi = {
    getSales(
        query: SalesQuery,
        signal?: AbortSignal,
    ): Promise<SalesPageDto> {
        return api.get<SalesPageDto>(
            '/api/v1/sales',
            {
                signal,

                query: {
                    productId:
                        query.productId
                        || undefined,

                    dateFrom:
                        query.dateFrom
                        || undefined,

                    dateTo:
                        query.dateTo
                        || undefined,

                    page: query.page,
                    size: query.size,
                },
            },
        )
    },

    importCsv(
        file: File,
    ): Promise<CsvImportResponse> {
        const formData =
            new FormData()

        formData.append(
            'file',
            file,
        )

        return api.upload<CsvImportResponse>(
            '/api/v1/sales/import',
            formData,
        )
    },
}