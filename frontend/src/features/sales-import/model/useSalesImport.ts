import {
    useState,
} from 'react'

import {
    salesApi,
} from '@/features/sales/api/sales.api'

import type {
    CsvImportResponse,
} from '@/entities/sale/model/types'

export function useSalesImport() {
    const [
        result,
        setResult,
    ] = useState<
        CsvImportResponse | null
    >(null)

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

    async function importFile(
        file: File,
    ) {
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const response =
                await salesApi.importCsv(
                    file,
                )

            setResult(response)

            return response
        } catch (reason) {
            const normalized =
                reason instanceof Error
                    ? reason
                    : new Error(
                        'Не удалось импортировать CSV',
                    )

            setError(normalized)

            throw normalized
        } finally {
            setLoading(false)
        }
    }

    function reset() {
        setResult(null)
        setError(null)
        setLoading(false)
    }

    return {
        result,
        loading,
        error,

        importFile,
        reset,
    }
}