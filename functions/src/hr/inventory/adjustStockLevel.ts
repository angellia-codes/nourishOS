import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import {
  loadItemInTransaction,
  validateSizeVariant,
  validateOutletId,
  readStockLevel,
  stockCountDelta,
} from './helpers'

interface AdjustStockLevelInput {
  itemId: string
  outletId: string
  sizeVariant?: string | null
  countedQuantity: number
  reason: string
}

/**
 * Corrects one stock-on-hand line to a counted figure — a stock opname, which
 * is how this register actually gets reconciled (the shipped ledger is full of
 * receives captioned "last count on July", done that way because no direct
 * adjustment existed).
 *
 * It never writes the level on its own. The difference is booked as a real
 * `adjustment` movement in the same transaction, so the ledger and the level
 * can never disagree and the Inventory Cost report still accounts for the
 * write-on or write-off. Setting the level directly would silently break both.
 *
 * Counting a line to zero also deletes its stock-level document — that is the
 * "remove this line" path, and it leaves the movement behind as the record of
 * what was removed and why.
 *
 * hrInventory.manage, not hrInventory.record: recording a movement is a daily
 * outlet-leader act; overriding the balance to a counted figure is HR's, and
 * that permission is exactly hrManager plus superAdmin's bypass.
 */
export const adjustStockLevel = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.HR_INVENTORY_MANAGE)

    const input = (request.data ?? {}) as Partial<AdjustStockLevelInput>
    const outletId = validateOutletId(input.outletId)
    const reason = typeof input.reason === 'string' ? input.reason.trim() : ''
    if (!reason) {
      throw new AppError('invalid-argument', 'reason is required for a stock adjustment.')
    }

    const movementRef = db.collection(COLLECTIONS.HR_STOCK_MOVEMENTS).doc()
    let delta = 0
    let previousQuantity = 0

    await db.runTransaction(async (tx) => {
      const item = await loadItemInTransaction(tx, input.itemId)
      const sizeVariant = validateSizeVariant(item.data, input.sizeVariant ?? null)
      const level = await readStockLevel(tx, item.ref.id, outletId, sizeVariant)

      previousQuantity = level.quantityOnHand
      const counted = input.countedQuantity as number
      delta = stockCountDelta(previousQuantity, counted)

      if (counted === 0) {
        // Nothing left to track at this location/size — drop the line rather
        // than leave a zero row behind. Safe even when it never existed.
        if (level.exists) tx.delete(level.ref)
      } else if (level.exists) {
        tx.update(level.ref, { quantityOnHand: counted, ...updatedFields(user.uid) })
      } else {
        tx.set(level.ref, {
          itemId: item.ref.id,
          outletId,
          sizeVariant,
          quantityOnHand: counted,
          ...newDocumentBaseFields(user.uid),
        })
      }

      const unitCost = (item.data.unitCost as number) ?? 0
      tx.set(movementRef, {
        itemId: item.ref.id,
        sizeVariant,
        outletId,
        movementType: 'adjustment',
        quantityDelta: delta,
        unitCost,
        totalCost: delta * unitCost,
        reason,
        issuedToEmployeeId: null,
        issuedToEmployeeName: null,
        issuedToDepartmentId: null,
        issuedToPosition: null,
        linkedMovementId: null,
        performedBy: user.uid,
        ...newDocumentBaseFields(user.uid),
      })
    })

    await recordAuditEvent({
      eventType: 'StockLevelAdjusted',
      category: 'HR',
      module: 'hr',
      resourceType: 'stockMovement',
      resourceId: movementRef.id,
      action: 'update',
      user,
      previousValues: { quantityOnHand: previousQuantity },
      newValues: { itemId: input.itemId, outletId, countedQuantity: input.countedQuantity, delta, reason },
    })

    return successResponse({ movementId: movementRef.id, delta }, 'Stock on hand updated.')
  } catch (error) {
    handleError(error)
  }
})
