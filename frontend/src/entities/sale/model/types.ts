export interface SaleDto {
    id: number
    productId: number
    date: string
    quantity: number
}

export interface Sale {
    id: string
    productId: string
    date: string
    quantity: number
}

export interface SalesPageDto {
    items: SaleDto[]
    page: number
    size: number
    totalElements: number
    totalPages: number
}

export interface SalesPage {
    items: Sale[]
    page: number
    size: number
    totalElements: number
    totalPages: number
}

export interface CsvImportError {
    row: number
    code: string
    message: string
}

export interface CsvImportResponse {
    totalRows: number
    importedRows: number
    skippedRows: number
    errors: CsvImportError[]
}

export function mapSaleDto(
    dto: SaleDto,
): Sale {
    return {
        id: String(dto.id),
        productId:
            String(dto.productId),
        date: dto.date,
        quantity: dto.quantity,
    }
}

export function mapSalesPageDto(
    dto: SalesPageDto,
): SalesPage {
    return {
        items:
            dto.items.map(
                mapSaleDto,
            ),

        page: dto.page,
        size: dto.size,

        totalElements:
        dto.totalElements,

        totalPages:
        dto.totalPages,
    }
}