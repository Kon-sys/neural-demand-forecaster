import type { Product } from './products'
import { initialProducts } from './products'
import { isoDay } from '../lib/format'
export interface Forecast { id: string; product: Product; horizon: number; createdAt: string; status: 'completed'; model: string; mae: number; rmse: number; mape: number; values: { date: string; value: number }[] }
const cannedValues = [58, 62, 66, 63, 56, 52, 60, 64, 68, 71, 65, 59, 57, 64, 69, 73, 76, 68, 63, 61, 69, 73, 77, 80, 73, 68, 65, 72, 77, 82]
export function mockForecast(product: Product, horizon: number, id: string = crypto.randomUUID(), createdAt = new Date().toISOString()): Forecast {
  return { id, product: { ...product }, horizon, createdAt, status: 'completed', model: 'Демонстрационная', mae: 3.24, rmse: 4.18, mape: 6.82, values: cannedValues.slice(0, horizon).map((value, i) => ({ date: isoDay(i), value })) }
}
export const initialForecasts = [0, 1, 3, 2, 4, 0].map((p, i) => mockForecast(initialProducts[p], [30, 14, 7][i % 3], `forecast-${i + 1}`, `2026-09-${String(18 - i).padStart(2, '0')}T${i % 2 ? '11:24' : '09:42'}:00`))
