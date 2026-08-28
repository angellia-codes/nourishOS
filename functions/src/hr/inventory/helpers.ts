import { db, COLLECTIONS, AppError, newDocumentBaseFields, updatedFields } from '../../lib'

type Transaction = FirebaseFirestore.Transaction
type DocumentReference = FirebaseFirestore.DocumentReference
type DocumentData = FirebaseFirestore.DocumentData

export const CATEGORIES = [
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
] as const
export type Category = (typeof CATEGORIES)[number]

/** Central store all uniform/asset stock is received into, issued from, and transferred out of — not a real outlet, so it stays out of OUTLETS. */
export const HR_STORE_ID = 'hr_store'

/** Mirrors MovementType in src/types/inventory.types.ts — functions/ can't import from src/. */
export type MovementType = 'receive' | 'issue' | 'return' | 'transferOut' | 'transferIn' | 'adjustment'

export function validateCategory(category: unknown): Category {
  if (typeof category !== 'string' || !CATEGORIES.includes(category as Category)) {
    throw new AppError('invalid-argument', `category must be one of: ${CATEGORIES.join(', ')}.`)
  }
  return category as Category
}

export function validateUnitCost(unitCost: unknown): number {
  if (typeof unitCost !== 'number' || !Number.isFinite(unitCost) || unitCost < 0) {
    throw new AppError('invalid-argument', 'unitCost must be a non-negative number.')
  }
  return unitCost
}

export function validateSizes(hasSizes: boolean, sizes: unknown): string[] {
  if (!hasSizes) return []
  if (!Array.isArray(sizes) || sizes.length === 0 || !sizes.every((s) => typeof s === 'string' && s.trim())) {
    throw new AppError('invalid-argument', 'sizes must be a non-empty list of labels when hasSizes is true.')
  }
  return [...new Set(sizes.map((s) => (s as string).trim()))]
}

export function validateOutletId(outletId: unknown, fieldName = 'outletId'): string {
  if (typeof outletId !== 'string' || !outletId.trim()) {
    throw new AppError('invalid-argument', `${fieldName} is required.`)
  }
  return outletId.trim()
}

export function validateQuantity(quantity: unknown): number {
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
    throw new AppError('invalid-argument', 'quantity must be a positive whole number.')
  }
  return quantity
}

/** Reads and validates the item inside an open transaction; throws if archived. */
export async function loadItemInTransaction(
  tx: Transaction,
  itemId: unknown,
): Promise<{ ref: DocumentReference; data: DocumentData }> {
  if (typeof itemId !== 'string' || !itemId) {
    throw new AppError('invalid-argument', 'itemId is required.')
  }
  const ref = db.collection(COLLECTIONS.HR_INVENTORY_ITEMS).doc(itemId)
  const snap = await tx.get(ref)
  if (!snap.exists) {
    throw new AppError('not-found', 'That inventory item no longer exists.')
  }
  const data = snap.data() as DocumentData
  if (data.isArchived) {
    throw new AppError('failed-precondition', 'This item is archived and can no longer be moved.')
  }
  return { ref, data }
}

/** Validates a size against the item's configured size list; null when the item doesn't track sizes. */
export function validateSizeVariant(item: DocumentData, sizeVariant: unknown): string | null {
  if (!item.hasSizes) {
    if (sizeVariant) {
      throw new AppError('invalid-argument', 'This item does not track sizes — omit sizeVariant.')
    }
    return null
  }
  const sizes = (item.sizes as string[]) ?? []
  if (typeof sizeVariant !== 'string' || !sizes.includes(sizeVariant)) {
    throw new AppError('invalid-argument', `sizeVariant must be one of: ${sizes.join(', ')}.`)
  }
  return sizeVariant
}

export function stockLevelDocId(itemId: string, outletId: string, sizeVariant: string | null): string {
  return `${itemId}__${outletId}__${sizeVariant ?? 'none'}`
}

interface StockLevelHandle {
  ref: DocumentReference
  exists: boolean
  quantityOnHand: number
}

/** Reads one stock-level doc inside an open transaction. Must run before any writes in that transaction. */
export async function readStockLevel(
  tx: Transaction,
  itemId: string,
  outletId: string,
  sizeVariant: string | null,
): Promise<StockLevelHandle> {
  const ref = db.collection(COLLECTIONS.HR_STOCK_LEVELS).doc(stockLevelDocId(itemId, outletId, sizeVariant))
  const snap = await tx.get(ref)
  return {
    ref,
    exists: snap.exists,
    quantityOnHand: snap.exists ? ((snap.data()?.quantityOnHand as number) ?? 0) : 0,
  }
}

/** Applies the new on-hand quantity computed by the caller. Never call before every read in the transaction is done. */
export function writeStockLevel(
  tx: Transaction,
  level: StockLevelHandle,
  fields: { itemId: string; outletId: string; sizeVariant: string | null },
  nextQuantity: number,
  uid: string,
): void {
  if (level.exists) {
    tx.update(level.ref, { quantityOnHand: nextQuantity, ...updatedFields(uid) })
  } else {
    tx.set(level.ref, {
      itemId: fields.itemId,
      outletId: fields.outletId,
      sizeVariant: fields.sizeVariant,
      quantityOnHand: nextQuantity,
      ...newDocumentBaseFields(uid),
    })
  }
}

/** Throws failed-precondition if applying delta to current would take on-hand negative; returns the next value. */
export function applyDelta(current: number, delta: number): number {
  const next = current + delta
  if (next < 0) {
    throw new AppError('failed-precondition', `Not enough stock on hand (${current} available).`)
  }
  return next
}
