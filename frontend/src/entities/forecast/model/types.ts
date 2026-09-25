export type ForecastStatus =
    | 'PENDING'
    | 'PROCESSING'
    | 'COMPLETED'
    | 'FAILED'

export interface ForecastValueDto {
    date: string
    predictedQuantity: number
}

export interface ForecastDto {
    id: number
    userId: number
    productId: number
    productSku: string
    forecastHorizon: number
    modelVersion: string | null
    status: ForecastStatus
    mae: number | null
    rmse: number | null
    mape: number | null
    createdAt: string
    startedAt: string | null
    completedAt: string | null
    errorMessage: string | null
    values: ForecastValueDto[]
}

export interface ForecastHistoryItemDto {
    id: number
    productId: number
    productSku: string
    productName: string
    forecastHorizon: number
    modelVersion: string
    status: ForecastStatus
    createdAt: string
    completedAt: string | null
}

export interface ForecastHistoryPageDto {
    items: ForecastHistoryItemDto[]
    page: number
    size: number
    totalElements: number
    totalPages: number
}

export interface ForecastProduct {
    id: string
    sku: string
    name: string
}

export interface ForecastValue {
    date: string
    value: number
}

export interface ForecastMetrics {
    mae: number | null
    rmse: number | null
    mape: number | null
}

export interface Forecast {
    id: string
    product: ForecastProduct
    forecastHorizon: number
    createdAt: string
    modelVersion: string
    status: ForecastStatus
    values: ForecastValue[]
    metrics: ForecastMetrics | null
}

export interface ForecastHistoryItem {
    id: string
    productId: string
    productSku: string
    productName: string
    forecastHorizon: number
    modelVersion: string
    status: ForecastStatus
    createdAt: string
    completedAt: string | null
}

export interface ForecastHistoryPage {
    items: ForecastHistoryItem[]
    page: number
    size: number
    totalElements: number
    totalPages: number
}

export interface CreateForecastInput {
    productId: string
    forecastHorizon: number
}

export interface CreateForecastRequestDto {
    productId: number
    forecastHorizon: number
}

export interface ForecastHistoryParams {
    productId?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    size?: number
}

function mapMetrics(
    dto: ForecastDto,
): ForecastMetrics | null {
    const hasMetrics = (
        dto.mae !== null
        || dto.rmse !== null
        || dto.mape !== null
    )

    if (!hasMetrics) {
        return null
    }

    return {
        mae: dto.mae,
        rmse: dto.rmse,
        mape: dto.mape,
    }
}

export function mapForecastDto(
    dto: ForecastDto,
): Forecast {
    return {
        id: String(
            dto.id,
        ),

        product: {
            id: String(
                dto.productId,
            ),

            sku:
            dto.productSku,

            name:
            dto.productSku,
        },

        forecastHorizon:
        dto.forecastHorizon,

        createdAt:
        dto.createdAt,

        modelVersion:
            dto.modelVersion
            ?? 'bootstrap',

        status:
        dto.status,

        values:
            dto.values.map(
                item => ({
                    date:
                    item.date,

                    value:
                    item.predictedQuantity,
                }),
            ),

        metrics:
            mapMetrics(
                dto,
            ),
    }
}

export function mapForecastHistoryItemDto(
    dto: ForecastHistoryItemDto,
): ForecastHistoryItem {
    return {
        id: String(
            dto.id,
        ),

        productId: String(
            dto.productId,
        ),

        productSku:
        dto.productSku,

        productName:
        dto.productName,

        forecastHorizon:
        dto.forecastHorizon,

        modelVersion:
        dto.modelVersion,

        status:
        dto.status,

        createdAt:
        dto.createdAt,

        completedAt:
        dto.completedAt,
    }
}

export function mapForecastHistoryPageDto(
    dto: ForecastHistoryPageDto,
): ForecastHistoryPage {
    return {
        items:
            dto.items.map(
                mapForecastHistoryItemDto,
            ),

        page:
        dto.page,

        size:
        dto.size,

        totalElements:
        dto.totalElements,

        totalPages:
        dto.totalPages,
    }
}