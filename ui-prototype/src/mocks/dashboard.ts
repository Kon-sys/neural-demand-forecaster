import { initialSales } from './sales'
export function availability(productIds: string[]) {
 const sales = initialSales.filter(s => productIds.includes(s.productId))
 return { count: sales.length, from: sales.length ? '2026-06-01' : null, to: sales.length ? '2026-08-31' : null }
}
