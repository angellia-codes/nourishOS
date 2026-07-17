import type { StockCategory, StorageCondition, MovementType } from './inventoryDemoData'

/** "16 Jul 2026" from a stored 'YYYY-MM-DD' civil date — same convention as HR's formatIsoDate. */
export function formatInventoryDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export const STOCK_CATEGORY_LABELS: Record<StockCategory, string> = {
  food: 'Food',
  beverage: 'Beverage',
  packaging: 'Packaging',
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
}

export const STORAGE_CONDITION_LABELS: Record<StorageCondition, string> = {
  chilled: 'Chilled',
  frozen: 'Frozen',
  dry: 'Dry',
}

/** inventory.md §8 "Types". */
export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  in: 'Stock In',
  out: 'Stock Out',
  transfer: 'Transfer',
  adjustment: 'Adjustment',
  waste: 'Waste',
  return: 'Return',
}

export const MOVEMENT_TYPE_VARIANT: Record<MovementType, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  in: 'success',
  out: 'info',
  transfer: 'info',
  adjustment: 'warning',
  waste: 'error',
  return: 'neutral',
}
