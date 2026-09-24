function normalizeBaseUrl(value: string): string {
    return value.trim().replace(/\/+$/, '')
}

const rawApiBaseUrl =
    import.meta.env.VITE_API_BASE_URL?.trim()
    || 'http://localhost:8080'

export const env = {
    apiBaseUrl: normalizeBaseUrl(rawApiBaseUrl),
} as const