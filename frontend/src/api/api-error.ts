export interface ApiErrorPayload {
    timestamp?: string
    status?: number
    error?: string
    code?: string
    message?: string
    path?: string
}

export class ApiError extends Error {
    readonly status: number
    readonly code: string
    readonly path: string | null

    constructor(
        status: number,
        code: string,
        message: string,
        path: string | null = null,
    ) {
        super(message)

        this.name = 'ApiError'
        this.status = status
        this.code = code
        this.path = path
    }
}

export function isApiError(
    error: unknown,
): error is ApiError {
    return error instanceof ApiError
}