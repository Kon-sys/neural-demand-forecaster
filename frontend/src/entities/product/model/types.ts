export interface ProductDto {
    id: number
    sku: string
    name: string
    category: string | null
}

export interface Product {
    id: string
    sku: string
    name: string
    category: string | null
}

export interface ProductPageDto {
    items: ProductDto[]
    page: number
    size: number
    totalElements: number
    totalPages: number
}

export type ProductsResponseDto =
    | ProductDto[]
    | ProductPageDto

export interface ProductInput {
    sku: string
    name: string
    category: string | null
}

export function mapProductDto(
    dto: ProductDto,
): Product {
    return {
        id: String(dto.id),
        sku: dto.sku,
        name: dto.name,
        category: dto.category,
    }
}

export function normalizeProductsResponse(
    response: ProductsResponseDto,
): Product[] {
    const items =
        Array.isArray(response)
            ? response
            : response.items

    return items.map(
        mapProductDto,
    )
}