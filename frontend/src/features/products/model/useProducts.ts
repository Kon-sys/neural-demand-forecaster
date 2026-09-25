import {
    useCallback,
    useEffect,
    useState,
} from 'react'

import {
    productsApi,
} from '@/features/products/api/products.api'

import {
    mapProductDto,
    normalizeProductsResponse,
    type Product,
    type ProductInput,
} from '@/entities/product/model/types'

interface ProductsRequestState {
    version: number
    error: Error | null
}

export function useProducts() {
    const [
        products,
        setProducts,
    ] = useState<Product[]>([])

    const [
        reloadVersion,
        setReloadVersion,
    ] = useState(0)

    const [
        requestState,
        setRequestState,
    ] = useState<ProductsRequestState>({
        version: -1,
        error: null,
    })

    const loading =
        requestState.version
        !== reloadVersion

    const error =
        requestState.version
        === reloadVersion
            ? requestState.error
            : null

    useEffect(() => {
        const controller =
            new AbortController()

        const version =
            reloadVersion

        productsApi
            .getAll(
                controller.signal,
            )
            .then(response => {
                if (
                    controller.signal
                        .aborted
                ) {
                    return
                }

                setProducts(
                    normalizeProductsResponse(
                        response,
                    ),
                )

                setRequestState({
                    version,
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
                            'Не удалось загрузить товары',
                        )

                setRequestState({
                    version,
                    error:
                    normalizedError,
                })
            })

        return () => {
            controller.abort()
        }
    }, [
        reloadVersion,
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

    const createProduct =
        useCallback(
            async (
                input: ProductInput,
            ) => {
                const response =
                    await productsApi.create(
                        input,
                    )

                const product =
                    mapProductDto(
                        response,
                    )

                setProducts(current =>
                    [
                        ...current,
                        product,
                    ].sort(
                        (
                            first,
                            second,
                        ) =>
                            first.name.localeCompare(
                                second.name,
                                'ru',
                            ),
                    ),
                )

                return product
            },
            [],
        )

    const updateProduct =
        useCallback(
            async (
                id: string,
                input: ProductInput,
            ) => {
                const response =
                    await productsApi.update(
                        id,
                        input,
                    )

                const product =
                    mapProductDto(
                        response,
                    )

                setProducts(current =>
                    current.map(item =>
                        item.id === id
                            ? product
                            : item,
                    ),
                )

                return product
            },
            [],
        )

    const deleteProduct =
        useCallback(
            async (
                id: string,
            ) => {
                await productsApi.delete(
                    id,
                )

                setProducts(current =>
                    current.filter(
                        product =>
                            product.id !== id,
                    ),
                )
            },
            [],
        )

    return {
        products,
        loading,
        error,

        reload,

        createProduct,
        updateProduct,
        deleteProduct,
    }
}