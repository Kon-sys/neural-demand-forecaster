import { initialProducts } from './products'
import { isoDay } from '@/shared/lib/format'
export interface Sale { id: string; productId: string; date: string; quantity: number }
// Deterministic demonstration sales, not a forecasting algorithm.
export const initialSales: Sale[] = initialProducts.flatMap((p, index) => Array.from({ length: 92 }, (_, i) => ({ id: `${p.id}-${i}`, productId: p.id, date: isoDay(i, '2026-06-01'), quantity: Math.round(34 + index * 12 + i * .19 + Math.sin(i * .78 + index) * 11 + Math.cos(i * .3) * 6) })))
export const salesFor = (productId: string) => initialSales.filter(s => s.productId === productId)
