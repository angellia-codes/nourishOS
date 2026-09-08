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

export interface StockLevelHandle {
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

export interface MovementLeg {
  ref: DocumentReference
  data: DocumentData
}

/**
 * Loads a movement plus its linked transfer counterpart, so voiding one leg of
 * a paired transfer can never leave the other half standing. Throws if the
 * movement is already voided — voiding twice would reverse the stock twice.
 */
export async function loadMovementLegsInTransaction(tx: Transaction, movementId: unknown): Promise<MovementLeg[]> {
  if (typeof movementId !== 'string' || !movementId) {
    throw new AppError('invalid-argument', 'movementId is required.')
  }
  const ref = db.collection(COLLECTIONS.HR_STOCK_MOVEMENTS).doc(movementId)
  const snap = await tx.get(ref)
  if (!snap.exists) {
    throw new AppError('not-found', 'That stock movement no longer exists.')
  }
  const data = snap.data() as DocumentData
  if (data.isVoided) {
    throw new AppError('failed-precondition', 'That movement has already been voided.')
  }

  const legs: MovementLeg[] = [{ ref, data }]
  const linkedId = data.linkedMovementId
  if (typeof linkedId === 'string' && linkedId) {
    const linkedRef = db.collection(COLLECTIONS.HR_STOCK_MOVEMENTS).doc(linkedId)
    const linkedSnap = await tx.get(linkedRef)
    const linkedData = linkedSnap.data()
    // A leg already voided on its own is skipped rather than reversed twice.
    if (linkedSnap.exists && linkedData && !linkedData.isVoided) {
      legs.push({ ref: linkedRef, data: linkedData })
    }
  }
  return legs
}

export interface LevelDelta {
  itemId: string
  outletId: string
  sizeVariant: string | null
  delta: number
}

/**
 * Collapses deltas landing on the same stock-level doc into one entry. An edit
 * that only changes quantity reverses and re-applies against the same
 * (item, outlet, size), and Firestore forbids reading a doc twice in one
 * transaction after writing it — merging first keeps it to one read, one write.
 */
export function mergeLevelDeltas(deltas: LevelDelta[]): LevelDelta[] {
  const merged = new Map<string, LevelDelta>()
  for (const entry of deltas) {
    const key = stockLevelDocId(entry.itemId, entry.outletId, entry.sizeVariant)
    const current = merged.get(key)
    if (current) current.delta += entry.delta
    else merged.set(key, { ...entry })
  }
  return [...merged.values()]
}

/**
 * Reads every distinct stock level the deltas touch, then applies them — all
 * reads before any write, as Firestore transactions require. Throws
 * failed-precondition (via applyDelta) if any level would go negative, which
 * aborts the whole transaction before a single write lands.
 */
export async function applyLevelDeltas(tx: Transaction, deltas: LevelDelta[], uid: string): Promise<void> {
  const merged = mergeLevelDeltas(deltas)

  const handles: Array<{ level: StockLevelHandle; entry: LevelDelta }> = []
  for (const entry of merged) {
    handles.push({ level: await readStockLevel(tx, entry.itemId, entry.outletId, entry.sizeVariant), entry })
  }

  for (const { level, entry } of handles) {
    if (entry.delta === 0) continue
    const next = applyDelta(level.quantityOnHand, entry.delta)
    writeStockLevel(
      tx,
      level,
      { itemId: entry.itemId, outletId: entry.outletId, sizeVariant: entry.sizeVariant },
      next,
      uid,
    )
  }
}

/**
 * The signed movement a stock count implies. Validates the counted figure the
 * same way validateQuantity does, except zero is allowed — counting a bin
 * empty is the whole point of "remove this line".
 */
export function stockCountDelta(currentQuantity: number, countedQuantity: unknown): number {
  if (typeof countedQuantity !== 'number' || !Number.isInteger(countedQuantity) || countedQuantity < 0) {
    throw new AppError('invalid-argument', 'countedQuantity must be a whole number of zero or more.')
  }
  const delta = countedQuantity - currentQuantity
  if (delta === 0) {
    throw new AppError('failed-precondition', `Stock on hand is already ${currentQuantity}.`)
  }
  return delta
}
