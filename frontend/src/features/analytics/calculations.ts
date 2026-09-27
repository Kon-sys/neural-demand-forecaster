import type { Point } from '@/entities/analytics/types'

export function forecastKpis(values: Point[], previousTotal: number | null) {
  if (!values.length) return null
  const total = values.reduce((sum, item) => sum + item.value, 0)
  return {
    total,
    average: total / values.length,
    peak: values.reduce((peak, item) => item.value > peak.value ? item : peak),
    minimum: values.reduce((minimum, item) => item.value < minimum.value ? item : minimum),
    change: previousTotal !== null && previousTotal > 0 ? (total - previousTotal) / previousTotal * 100 : null,
  }
}
