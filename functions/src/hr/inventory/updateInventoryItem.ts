import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { validateUnitCost, validateSizes } from './helpers'

interface UpdateInventoryItemInput {
  itemId: string
  name?: string
  unitCost?: number
  hasSizes?: boolean
  sizes?: string[]
  isArchived?: boolean
}

/**
 * category is immutable after creation. hasSizes was too, until it turned out
 * to be a dead end: an item created with the box unticked could never receive
 * stock by size, in the UI or here, because updateInventoryItem rejected a
 * `sizes` list for an item whose hasSizes was false. It is now editable, but
 * only while the item is untouched — no non-voided movements and every stock
 * level at zero — since that is exactly the condition under which no
 * hrStockLevels doc keyed by the old size set can be orphaned. Those empty
 * levels are deleted in the same transaction so no stale `__none` row
 * survives the switch.
 *
 * Everything else (name, unitCost, the size list, archive state) stays freely
 * editable, except that a size still holding stock cannot be dropped from the
 * list — that would strand its level doc behind a size the item no longer offers.
 */
export const updateInventoryItem = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.HR_INVENTORY_MANAGE)

    const input = (request.data ?? {}) as Partial<UpdateInventoryItemInput>
    if (!input.itemId) {
      throw new AppError('invalid-argument', 'itemId is required.')
    }
    const itemId = input.itemId

    const itemRef = db.collection(COLLECTIONS.HR_INVENTORY_ITEMS).doc(itemId)
    let existing: Record<string, unknown> = {}
    let changes: Record<string, unknown> = {}

    await db.runTransaction(async (tx) => {
      changes = {}
      const snap = await tx.get(itemRef)
      if (!snap.exists) {
        throw new AppError('not-found', 'That inventory item no longer exists.')
      }
      existing = snap.data() as Record<string, unknown>

      if (input.name !== undefined) {
        if (!input.name.trim()) {
          throw new AppError('invalid-argument', 'name cannot be empty.')
        }
        changes.name = input.name.trim()
      }
      if (input.unitCost !== undefined) {
        changes.unitCost = validateUnitCost(input.unitCost)
      }
      if (input.isArchived !== undefined) {
        changes.isArchived = Boolean(input.isArchived)
      }

      const wasSized = Boolean(existing.hasSizes)
      const flipsSizeMode = input.hasSizes !== undefined && Boolean(input.hasSizes) !== wasSized

      if (flipsSizeMode || input.sizes !== undefined) {
        // Both queries are single-field equality — no composite index needed.
        // Reading them inside the transaction is what makes the "untouched"
        // check safe against a receiveStock landing mid-edit.
        const levelSnaps = await tx.get(
          db.collection(COLLECTIONS.HR_STOCK_LEVELS).where('itemId', '==', itemId),
        )
        const stockBySize = new Map<string, number>()
        for (const doc of levelSnaps.docs) {
          const level = doc.data()
          const key = (level.sizeVariant as string | null) ?? ''
          stockBySize.set(key, (stockBySize.get(key) ?? 0) + ((level.quantityOnHand as number) ?? 0))
        }

        if (flipsSizeMode) {
          // Legacy movements carry no isVoided field, so an `== false` query
          // would skip them entirely — filter in memory instead.
          const movementSnaps = await tx.get(
            db.collection(COLLECTIONS.HR_STOCK_MOVEMENTS).where('itemId', '==', itemId),
          )
          const activeMovements = movementSnaps.docs.filter((doc) => !doc.data().isVoided)
          const totalOnHand = [...stockBySize.values()].reduce((sum, qty) => sum + qty, 0)
          if (activeMovements.length > 0 || totalOnHand !== 0) {
            throw new AppError(
              'failed-precondition',
              'Size tracking can only change while the item has no stock on hand and no movement history. Void its movements first, or create a new item.',
            )
          }

          const hasSizes = Boolean(input.hasSizes)
          changes.hasSizes = hasSizes
          changes.sizes = validateSizes(hasSizes, input.sizes)
          for (const doc of levelSnaps.docs) tx.delete(doc.ref)
        } else if (input.sizes !== undefined) {
          if (!wasSized) {
            throw new AppError('failed-precondition', 'This item does not track sizes.')
          }
          const nextSizes = validateSizes(true, input.sizes)
          const stranded = [...stockBySize.entries()]
            .filter(([size, qty]) => qty > 0 && size !== '' && !nextSizes.includes(size))
            .map(([size]) => size)
          if (stranded.length > 0) {
            throw new AppError(
              'failed-precondition',
              `Can't remove a size that still holds stock: ${stranded.join(', ')}.`,
            )
          }
          changes.sizes = nextSizes
        }
      }

      if (Object.keys(changes).length === 0) {
        throw new AppError('invalid-argument', 'No updatable fields were provided.')
      }

      tx.update(itemRef, { ...changes, ...updatedFields(user.uid) })
    })

    const previousValues: Record<string, unknown> = {}
    for (const key of Object.keys(changes)) previousValues[key] = existing[key] ?? null

    await recordAuditEvent({
      eventType: 'InventoryItemUpdated',
      category: 'HR',
      module: 'hr',
      resourceType: 'inventoryItem',
      resourceId: itemId,
      action: 'update',
      user,
      previousValues,
      newValues: changes,
    })

    return successResponse({ itemId }, 'Item updated.')
  } catch (error) {
    handleError(error)
  }
})
