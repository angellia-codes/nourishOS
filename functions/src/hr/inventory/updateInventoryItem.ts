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
import { validateUnitCost } from './helpers'

interface UpdateInventoryItemInput {
  itemId: string
  name?: string
  unitCost?: number
  sizes?: string[]
  isArchived?: boolean
}

/**
 * category and hasSizes are immutable after creation — changing either would
 * orphan existing hrStockLevels docs keyed by the old size set. Everything
 * else (name, unitCost, the size list, archive state) can be edited.
 */
export const updateInventoryItem = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.HR_INVENTORY_MANAGE)

    const input = (request.data ?? {}) as Partial<UpdateInventoryItemInput>
    if (!input.itemId) {
      throw new AppError('invalid-argument', 'itemId is required.')
    }

    const itemRef = db.collection(COLLECTIONS.HR_INVENTORY_ITEMS).doc(input.itemId)
    const snap = await itemRef.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That inventory item no longer exists.')
    }
    const existing = snap.data() as Record<string, unknown>

    const changes: Record<string, unknown> = {}

    if (input.name !== undefined) {
      if (!input.name.trim()) {
        throw new AppError('invalid-argument', 'name cannot be empty.')
      }
      changes.name = input.name.trim()
    }
    if (input.unitCost !== undefined) {
      changes.unitCost = validateUnitCost(input.unitCost)
    }
    if (input.sizes !== undefined) {
      if (!existing.hasSizes) {
        throw new AppError('failed-precondition', 'This item does not track sizes.')
      }
      if (!Array.isArray(input.sizes) || input.sizes.length === 0 || !input.sizes.every((s) => typeof s === 'string' && s.trim())) {
        throw new AppError('invalid-argument', 'sizes must be a non-empty list of labels.')
      }
      changes.sizes = [...new Set(input.sizes.map((s) => s.trim()))]
    }
    if (input.isArchived !== undefined) {
      changes.isArchived = Boolean(input.isArchived)
    }

    if (Object.keys(changes).length === 0) {
      throw new AppError('invalid-argument', 'No updatable fields were provided.')
    }

    await itemRef.update({ ...changes, ...updatedFields(user.uid) })

    const previousValues: Record<string, unknown> = {}
    for (const key of Object.keys(changes)) previousValues[key] = existing[key] ?? null

    await recordAuditEvent({
      eventType: 'InventoryItemUpdated',
      category: 'HR',
      module: 'hr',
      resourceType: 'inventoryItem',
      resourceId: input.itemId,
      action: 'update',
      user,
      previousValues,
      newValues: changes,
    })

    return successResponse({ itemId: input.itemId }, 'Item updated.')
  } catch (error) {
    handleError(error)
  }
})
