import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Unsubscribe } from '@/services/firestore'
import type { InventoryCategory, InventoryItem, StockLevel, StockMovement } from '@/types'

export interface InventoryItemInput {
  name: string
  category: InventoryCategory
  unitCost: number
  hasSizes: boolean
  sizes?: string[]
}

export function createInventoryItem(input: InventoryItemInput): Promise<{ itemId: string }> {
  return callFunction('createInventoryItem', input)
}

export interface UpdateInventoryItemInput {
  itemId: string
  name?: string
  unitCost?: number
  sizes?: string[]
  isArchived?: boolean
}

export function updateInventoryItem(input: UpdateInventoryItemInput): Promise<{ itemId: string }> {
  return callFunction('updateInventoryItem', input)
}

export interface ReceiveStockInput {
  itemId: string
  outletId: string
  sizeVariant?: string
  quantity: number
  reasonCode: 'supplierReceipt' | 'employeeReturn' | 'adjustment'
  notes?: string
}

export function receiveStock(input: ReceiveStockInput): Promise<{ movementId: string }> {
  return callFunction('receiveStock', input)
}

export interface IssueStockInput {
  itemId: string
  outletId: string
  sizeVariant?: string
  quantity: number
  reasonCode: 'employeeIssue' | 'writeOff' | 'adjustment'
  employeeId?: string
  notes?: string
}

export function issueStock(input: IssueStockInput): Promise<{ movementId: string }> {
  return callFunction('issueStock', input)
}

export interface TransferStockInput {
  itemId: string
  sourceOutletId: string
  destinationOutletId: string
  sizeVariant?: string
  quantity: number
  notes?: string
}

export function transferStock(
  input: TransferStockInput,
): Promise<{ movementOutId: string; movementInId: string }> {
  return callFunction('transferStock', input)
}

export function getInventoryItem(itemId: string): Promise<InventoryItem | null> {
  return getDocument<InventoryItem>(COLLECTIONS.HR_INVENTORY_ITEMS, itemId)
}

export function subscribeToInventoryItems(
  onChange: (items: InventoryItem[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<InventoryItem>(
    COLLECTIONS.HR_INVENTORY_ITEMS,
    [orderBy('name', 'asc')],
    onChange,
    onError,
  )
}

/**
 * Full stock-level snapshot, unfiltered. At this org's scale (a handful of
 * outlets × a small uniform/asset catalog) one subscription grouped
 * client-side comfortably beats an N-item list of per-item queries — same
 * reasoning subscribeToEmployees uses for the roster.
 */
export function subscribeToAllStockLevels(
  onChange: (levels: StockLevel[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<StockLevel>(COLLECTIONS.HR_STOCK_LEVELS, [], onChange, onError)
}

export function subscribeToStockLevels(
  itemId: string,
  onChange: (levels: StockLevel[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<StockLevel>(
    COLLECTIONS.HR_STOCK_LEVELS,
    [where('itemId', '==', itemId)],
    onChange,
    onError,
  )
}

export function subscribeToStockMovements(
  itemId: string,
  onChange: (movements: StockMovement[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<StockMovement>(
    COLLECTIONS.HR_STOCK_MOVEMENTS,
    [where('itemId', '==', itemId), orderBy('createdAt', 'desc')],
    onChange,
    onError,
  )
}

/**
 * Full movement ledger, unfiltered — for the Manning Cost report. Same scale
 * reasoning as subscribeToAllStockLevels.
 */
export function subscribeToAllStockMovements(
  onChange: (movements: StockMovement[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<StockMovement>(
    COLLECTIONS.HR_STOCK_MOVEMENTS,
    [orderBy('createdAt', 'desc')],
    onChange,
    onError,
  )
}
