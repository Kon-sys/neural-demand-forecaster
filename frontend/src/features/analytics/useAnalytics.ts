import { useEffect, useState } from 'react'
import { api } from '@/shared/api/client'

export function useAnalytics<T>(path: string | null) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ key: string; data: T | null; error: string | null } | null>(null)
  const key = `${path}:${attempt}`
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    api.get<T>(`/api/v1/analytics/${path}`, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ key, data, error: null })
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setState({ key, data: null, error: reason instanceof Error ? reason.message : 'Аналитика недоступна' })
    })
    return () => controller.abort()
  }, [path, key])
  const current = state?.key === key ? state : null
  return { data: current?.data ?? null, error: current?.error ?? null, loading: !!path && !current, reload: () => setAttempt(value => value + 1) }
}
