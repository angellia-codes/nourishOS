/** inventory.md §5 — demo stand-in for the location hierarchy (warehouse + outlet stock). */
export const INVENTORY_LOCATIONS = [
  { id: 'wh-hq', name: 'HQ Warehouse' },
  { id: 'outlet-sanur', name: 'Sanur' },
  { id: 'outlet-canggu', name: 'Canggu' },
  { id: 'outlet-ubud', name: 'Ubud' },
]

/** inventory.md §6 "Stock Item Master" category list. */
export type StockCategory = 'food' | 'beverage' | 'packaging' | 'cleaning' | 'maintenance'
export type StorageCondition = 'chilled' | 'frozen' | 'dry'

export interface MockStockItem {
  id: string
  name: string
  sku: string
  category: StockCategory
  unit: string
  storageCondition: StorageCondition
  reorderLevel: number
  maxStockLevel: number
}

export const MOCK_STOCK_ITEMS: MockStockItem[] = [
  { id: 'item-1', name: 'Chicken Breast', sku: 'FD-CHK-001', category: 'food', unit: 'kg', storageCondition: 'chilled', reorderLevel: 20, maxStockLevel: 100 },
  { id: 'item-2', name: 'Arabica Coffee Beans', sku: 'BV-CFB-002', category: 'beverage', unit: 'kg', storageCondition: 'dry', reorderLevel: 10, maxStockLevel: 60 },
  { id: 'item-3', name: 'Takeaway Box (Large)', sku: 'PK-BOX-010', category: 'packaging', unit: 'pcs', storageCondition: 'dry', reorderLevel: 500, maxStockLevel: 3000 },
  { id: 'item-4', name: 'Dish Soap Concentrate', sku: 'CL-SOAP-004', category: 'cleaning', unit: 'liter', storageCondition: 'dry', reorderLevel: 15, maxStockLevel: 50 },
  { id: 'item-5', name: 'Full Cream Milk', sku: 'BV-MLK-003', category: 'beverage', unit: 'liter', storageCondition: 'chilled', reorderLevel: 30, maxStockLevel: 150 },
  { id: 'item-6', name: 'Frozen Prawns', sku: 'FD-PRW-005', category: 'food', unit: 'kg', storageCondition: 'frozen', reorderLevel: 15, maxStockLevel: 80 },
]

export interface MockStockLevel {
  itemId: string
  locationId: string
  currentStock: number
  reservedStock: number
  lastUpdated: string
}

/** inventory.md §7 "Stock Levels" — current inventory per location. */
export const MOCK_STOCK_LEVELS: MockStockLevel[] = [
  { itemId: 'item-1', locationId: 'outlet-sanur', currentStock: 14, reservedStock: 4, lastUpdated: '2026-07-17' },
  { itemId: 'item-1', locationId: 'wh-hq', currentStock: 65, reservedStock: 0, lastUpdated: '2026-07-16' },
  { itemId: 'item-2', locationId: 'outlet-canggu', currentStock: 8, reservedStock: 2, lastUpdated: '2026-07-17' },
  { itemId: 'item-3', locationId: 'wh-hq', currentStock: 2200, reservedStock: 0, lastUpdated: '2026-07-15' },
  { itemId: 'item-4', locationId: 'outlet-ubud', currentStock: 9, reservedStock: 0, lastUpdated: '2026-07-17' },
  { itemId: 'item-5', locationId: 'outlet-sanur', currentStock: 42, reservedStock: 6, lastUpdated: '2026-07-17' },
  { itemId: 'item-6', locationId: 'outlet-canggu', currentStock: 22, reservedStock: 0, lastUpdated: '2026-07-16' },
]

/** inventory.md §8 "Stock Movements" — movement types. */
export type MovementType = 'in' | 'out' | 'transfer' | 'adjustment' | 'waste' | 'return'

export interface MockStockMovement {
  id: string
  itemId: string
  type: MovementType
  quantity: number
  sourceLocationId?: string
  destinationLocationId?: string
  createdByName: string
  createdAt: string
  notes?: string
}

export const MOCK_STOCK_MOVEMENTS: MockStockMovement[] = [
  { id: 'mv-1', itemId: 'item-1', type: 'in', quantity: 40, destinationLocationId: 'outlet-sanur', createdByName: 'Kadek Bayu Santika', createdAt: '2026-07-16', notes: 'GRN from supplier delivery' },
  { id: 'mv-2', itemId: 'item-5', type: 'out', quantity: 8, sourceLocationId: 'outlet-sanur', createdByName: 'Ni Made Ayu Ratih', createdAt: '2026-07-17', notes: 'Kitchen usage' },
  { id: 'mv-3', itemId: 'item-6', type: 'waste', quantity: 3, sourceLocationId: 'outlet-canggu', createdByName: 'I Wayan Surya Aditya', createdAt: '2026-07-16', notes: 'Expired, discarded' },
]

export function availableStock(level: MockStockLevel): number {
  return level.currentStock - level.reservedStock
}
