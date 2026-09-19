export interface Product { id: string; sku: string; name: string; category: string }
export const initialProducts: Product[] = [
  { id: '1', sku: 'NB-001', name: 'Ноутбук Про 15', category: 'Ноутбуки' },
  { id: '2', sku: 'SM-001', name: 'Смартфон Икс', category: 'Смартфоны' },
  { id: '3', sku: 'MN-001', name: 'Монитор 27″', category: 'Мониторы' },
  { id: '4', sku: 'HP-001', name: 'Беспроводные наушники', category: 'Аксессуары' },
  { id: '5', sku: 'KB-001', name: 'Механическая клавиатура', category: 'Аксессуары' },
  { id: '6', sku: 'MS-001', name: 'Беспроводная мышь', category: 'Аксессуары' },
  { id: '7', sku: 'TB-001', name: 'Планшет 11″', category: 'Планшеты' },
  { id: '8', sku: 'SP-001', name: 'Портативная колонка', category: 'Аксессуары' },
]
