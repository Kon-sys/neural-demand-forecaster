import {
    apiRequest,
    type QueryParams,
} from './http-client'

interface RequestOptions {
    query?: QueryParams
    signal?: AbortSignal
    auth?: boolean
}

interface MutationOptions
    extends RequestOptions {
    json?: unknown
}

export const api = {
    get<T>(
        path: string,
        options: RequestOptions = {},
    ): Promise<T> {
        return apiRequest<T>(
            path,
            {
                method: 'GET',
                ...options,
            },
        )
    },

    post<T>(
        path: string,
        options: MutationOptions = {},
    ): Promise<T> {
        return apiRequest<T>(
            path,
            {
                method: 'POST',
                ...options,
            },
        )
    },

    put<T>(
        path: string,
        options: MutationOptions = {},
    ): Promise<T> {
        return apiRequest<T>(
            path,
            {
                method: 'PUT',
                ...options,
            },
        )
    },

    patch<T>(
        path: string,
        options: MutationOptions = {},
    ): Promise<T> {
        return apiRequest<T>(
            path,
            {
                method: 'PATCH',
                ...options,
            },
        )
    },

    delete<T>(
        path: string,
        options: RequestOptions = {},
    ): Promise<T> {
        return apiRequest<T>(
            path,
            {
                method: 'DELETE',
                ...options,
            },
        )
    },

    upload<T>(
        path: string,
        formData: FormData,
        options: RequestOptions = {},
    ): Promise<T> {
        return apiRequest<T>(
            path,
            {
                method: 'POST',
                body: formData,
                ...options,
            },
        )
    },
}