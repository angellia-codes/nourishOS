import type { BaseDocument } from './firestore.types'

/** hr.md §12's asset-type list, collapsed to categories a stock item can belong to. */
export type InventoryCategory =
  | 'uniform'
  | 'safetyShoes'
  | 'apron'
  | 'hat'
  | 'equipment'
  | 'electronics'
  | 'bikeSeatCover'
  | 'handTowelGreen'
  | 'handTowelBlack'
  | 'nametag'
  | 'other'

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
  'uniform',
  'safetyShoes',
  'apron',
  'hat',
  'equipment',
  'electronics',
  'bikeSeatCover',
  'handTowelGreen',
  'handTowelBlack',
  'nametag',
  'other',
]

/**
 * HR Inventory catalog item — uniforms and simple assets (ID cards, keys,
 * equipment) as a quantity ledger, not per-serial asset tracking (see
 * CLAUDE.md "Current state of the tree"). `category` is immutable after
 * creation; `hasSizes` can only be switched while the item is untouched (no
 * stock on hand, no non-voided movements), past which flipping it would
 * orphan existing `StockLevel` docs keyed by the old size set.
 */
export interface InventoryItem extends BaseDocument {
  name: string
  category: InventoryCategory
  /** IDR. Snapshotted onto each movement at record time — not retroactive. */
  unitCost: number
  hasSizes: boolean
  /** Only meaningful when hasSizes is true, e.g. ['S', 'M', 'L', 'XL']. */
  sizes: string[]
}

/** Current on-hand snapshot for one (item, outlet, size) combination. */
export interface StockLevel extends BaseDocument {
  itemId: string
  outletId: string
  sizeVariant: string | null
  quantityOnHand: number
}

export type MovementType = 'receive' | 'issue' | 'return' | 'transferOut' | 'transferIn' | 'adjustment'

export type ReceiveReason = 'supplierReceipt' | 'employeeReturn' | 'adjustment'
export type IssueReason = 'employeeIssue' | 'writeOff' | 'adjustment'
export type MovementReason = ReceiveReason | IssueReason

/**
 * Ledger entry. Corrections go through `updateStockMovement`/`voidStockMovement`
 * (hrInventory.manage only) rather than a compensating entry — a void reverses
 * the stock effect but keeps the row, flagged `isVoided`, so the audit trail
 * still shows what was entered and who withdrew it. Every reader filters
 * voided rows out; nothing is ever hard-deleted.
 */
export interface StockMovement extends BaseDocument {
  itemId: string
  sizeVariant: string | null
  outletId: string
  movementType: MovementType
  /** Signed: positive for receive/return/transferIn, negative for issue/transferOut. */
  quantityDelta: number
  /** Snapshotted from the item's unitCost at movement time. */
  unitCost: number
  totalCost: number
  reason: string
  issuedToEmployeeId: string | null
  /** Snapshotted from the employee doc at issue time — not retroactive if the employee later changes department/position. */
  issuedToEmployeeName: string | null
  issuedToDepartmentId: string | null
  issuedToPosition: string | null
  /** Pairs a transferOut movement with its transferIn counterpart. */
  linkedMovementId: string | null
  performedBy: string
  /** Absent on every movement recorded before voiding shipped — read it as false. */
  isVoided?: boolean
  voidedAt?: string
  voidedBy?: string
  voidReason?: string
}
