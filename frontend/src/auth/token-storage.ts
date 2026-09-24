const ACCESS_TOKEN_KEY =
    'demand-forecast-access-token'

export function getAccessToken(): string | null {
    if (typeof window === 'undefined') {
        return null
    }

    const token =
        window.localStorage.getItem(
            ACCESS_TOKEN_KEY,
        )

    if (!token) {
        return null
    }

    const normalized =
        token.trim()

    return normalized
        ? normalized
        : null
}

export function setAccessToken(
    token: string,
): void {
    if (typeof window === 'undefined') {
        return
    }

    const normalized =
        token.trim()

    if (!normalized) {
        throw new Error(
            'Access token must not be blank',
        )
    }

    window.localStorage.setItem(
        ACCESS_TOKEN_KEY,
        normalized,
    )
}

export function clearAccessToken(): void {
    if (typeof window === 'undefined') {
        return
    }

    window.localStorage.removeItem(
        ACCESS_TOKEN_KEY,
    )
}