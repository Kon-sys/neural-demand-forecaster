import {
    api,
} from '@/shared/api/client'

import type {
    ProductDto,
    ProductInput,
    ProductsResponseDto,
} from '@/entities/product/model/types'

export const productsApi = {
    getAll(
        signal?: AbortSignal,
    ): Promise<ProductsResponseDto> {
        return api.get<ProductsResponseDto>(
            '/api/v1/products',
            {
                signal,

                query: {
                    page: 0,
                    size: 1000,
                },
            },
        )
    },

    getById(
        id: string,
        signal?: AbortSignal,
    ): Promise<ProductDto> {
        return api.get<ProductDto>(
            `/api/v1/products/${id}`,
            {
                signal,
            },
        )
    },

    create(
        input: ProductInput,
    ): Promise<ProductDto> {
        return api.post<ProductDto>(
            '/api/v1/products',
            {
                json: input,
            },
        )
    },

    update(
        id: string,
        input: ProductInput,
    ): Promise<ProductDto> {
        return api.put<ProductDto>(
            `/api/v1/products/${id}`,
            {
                json: input,
            },
        )
    },

    delete(
        id: string,
    ): Promise<void> {
        return api.delete<void>(
            `/api/v1/products/${id}`,
        )
    },
}