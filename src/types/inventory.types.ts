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
 * CLAUDE.md "Current state of the tree"). `category`/`hasSizes` are
 * immutable after creation — changing them would orphan existing
 * `StockLevel` docs keyed by the old size set.
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
 * Append-only ledger entry — never updated or deleted. A correction is a new
 * movement, the same way an accounting ledger is corrected.
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
}
