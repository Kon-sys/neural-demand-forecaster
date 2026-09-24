import {
    clearAccessToken,
    getAccessToken,
    SESSION_EXPIRED_EVENT,
} from './token-storage'
import {
    env,
} from '@/shared/config/env'
import {
    ApiError,
    type ApiErrorPayload,
} from './api-error'

type QueryValue =
    | string
    | number
    | boolean
    | null
    | undefined

export type QueryParams =
    Record<
        string,
        QueryValue
    >

interface ApiRequestOptions
    extends Omit<
        RequestInit,
        'body'
    > {
    body?: BodyInit | null
    json?: unknown
    query?: QueryParams
    auth?: boolean
    timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS =
    20_000

function buildUrl(
    path: string,
    query?: QueryParams,
): string {
    const normalizedPath =
        path.startsWith('/')
            ? path
            : `/${path}`

    const url =
        new URL(
            `${env.apiBaseUrl}${normalizedPath}`,
        )

    if (!query) {
        return url.toString()
    }

    for (
        const [
            key,
            value,
        ]
        of Object.entries(
        query,
    )
        ) {
        if (
            value === null
            || value === undefined
        ) {
            continue
        }

        url.searchParams.set(
            key,
            String(value),
        )
    }

    return url.toString()
}

async function parseResponseBody(
    response: Response,
): Promise<unknown> {
    if (
        response.status === 204
        || response.status === 205
    ) {
        return null
    }

    const contentType =
        response.headers.get(
            'content-type',
        )

    if (
        contentType?.includes(
            'application/json',
        )
    ) {
        return response.json()
    }

    const text =
        await response.text()

    return text || null
}

function toApiError(
    response: Response,
    payload: unknown,
): ApiError {
    if (
        typeof payload ===
        'object'
        && payload !== null
    ) {
        const body =
            payload as ApiErrorPayload

        return new ApiError(
            response.status,

            body.code
            || `HTTP_${response.status}`,

            body.message
            || response.statusText
            || 'Request failed',

            body.path
            || null,
        )
    }

    if (
        typeof payload ===
        'string'
        && payload.trim()
    ) {
        return new ApiError(
            response.status,
            `HTTP_${response.status}`,
            payload,
        )
    }

    return new ApiError(
        response.status,
        `HTTP_${response.status}`,
        response.statusText
        || 'Request failed',
    )
}

export async function apiRequest<T>(
    path: string,
    options:
    ApiRequestOptions = {},
): Promise<T> {
    const {
        body,
        json,
        query,
        auth = true,
        timeoutMs =
            DEFAULT_TIMEOUT_MS,
        headers:
            sourceHeaders,
        signal:
            sourceSignal,
        ...requestInit
    } = options

    if (
        body !== undefined
        && json !== undefined
    ) {
        throw new Error(
            'Use either body or json, not both',
        )
    }

    const headers =
        new Headers(
            sourceHeaders,
        )

    if (auth) {
        const token =
            getAccessToken()

        if (token) {
            headers.set(
                'Authorization',
                `Bearer ${token}`,
            )
        }
    }

    let requestBody =
        body

    if (
        json !== undefined
    ) {
        headers.set(
            'Content-Type',
            'application/json',
        )

        requestBody =
            JSON.stringify(
                json,
            )
    }

    const controller =
        new AbortController()

    const timeout =
        window.setTimeout(
            () =>
                controller.abort(),
            timeoutMs,
        )

    const abortFromSource =
        () =>
            controller.abort()

    sourceSignal
        ?.addEventListener(
            'abort',
            abortFromSource,
            {
                once: true,
            },
        )

    try {
        const response =
            await fetch(
                buildUrl(
                    path,
                    query,
                ),
                {
                    ...requestInit,

                    headers,

                    body:
                    requestBody,

                    signal:
                    controller.signal,
                },
            )

        const payload =
            await parseResponseBody(
                response,
            )

        if (!response.ok) {
            if (
                response.status === 401
                && auth
            ) {
                clearAccessToken()

                window.dispatchEvent(
                    new Event(
                        SESSION_EXPIRED_EVENT,
                    ),
                )
            }

            throw toApiError(
                response,
                payload,
            )
        }

        return payload as T
    } catch (error) {
        if (
            error instanceof ApiError
        ) {
            throw error
        }

        if (
            controller.signal.aborted
            && !sourceSignal
                ?.aborted
        ) {
            throw new ApiError(
                0,
                'REQUEST_TIMEOUT',
                'Сервер не ответил вовремя',
            )
        }

        if (
            error instanceof TypeError
        ) {
            throw new ApiError(
                0,
                'NETWORK_ERROR',
                'Не удалось подключиться к серверу',
            )
        }

        throw error
    } finally {
        window.clearTimeout(
            timeout,
        )

        sourceSignal
            ?.removeEventListener(
                'abort',
                abortFromSource,
            )
    }
}