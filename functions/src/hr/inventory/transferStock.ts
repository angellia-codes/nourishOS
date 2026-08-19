import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import {
  loadItemInTransaction,
  validateSizeVariant,
  validateOutletId,
  validateQuantity,
  readStockLevel,
  writeStockLevel,
  applyDelta,
} from './helpers'

interface TransferStockInput {
  itemId: string
  sourceOutletId: string
  destinationOutletId: string
  sizeVariant?: string
  quantity: number
  notes?: string
}

/**
 * One transaction, two linked ledger entries (transferOut at the source,
 * transferIn at the destination) sharing a linkedMovementId — the total
 * quantity across outlets never changes, only where it sits.
 */
export const transferStock = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.HR_INVENTORY_RECORD)

    const input = (request.data ?? {}) as Partial<TransferStockInput>

    const sourceOutletId = validateOutletId(input.sourceOutletId, 'sourceOutletId')
    const destinationOutletId = validateOutletId(input.destinationOutletId, 'destinationOutletId')
    if (sourceOutletId === destinationOutletId) {
      throw new AppError('invalid-argument', 'sourceOutletId and destinationOutletId must differ.')
    }
    const quantity = validateQuantity(input.quantity)
    const notes = typeof input.notes === 'string' ? input.notes.trim() : ''

    const outMovementRef = db.collection(COLLECTIONS.HR_STOCK_MOVEMENTS).doc()
    const inMovementRef = db.collection(COLLECTIONS.HR_STOCK_MOVEMENTS).doc()

    await db.runTransaction(async (tx) => {
      const item = await loadItemInTransaction(tx, input.itemId)
      const sizeVariant = validateSizeVariant(item.data, input.sizeVariant)

      // Both reads before either write — Firestore transactions forbid reads after writes.
      const sourceLevel = await readStockLevel(tx, item.ref.id, sourceOutletId, sizeVariant)
      const destLevel = await readStockLevel(tx, item.ref.id, destinationOutletId, sizeVariant)

      const sourceNext = applyDelta(sourceLevel.quantityOnHand, -quantity)
      const destNext = destLevel.quantityOnHand + quantity

      writeStockLevel(tx, sourceLevel, { itemId: item.ref.id, outletId: sourceOutletId, sizeVariant }, sourceNext, user.uid)
      writeStockLevel(tx, destLevel, { itemId: item.ref.id, outletId: destinationOutletId, sizeVariant }, destNext, user.uid)

      const unitCost = (item.data.unitCost as number) ?? 0
      const reason = notes || `Transfer to outlet ${destinationOutletId}`

      tx.set(outMovementRef, {
        itemId: item.ref.id,
        sizeVariant,
        outletId: sourceOutletId,
        movementType: 'transferOut',
        quantityDelta: -quantity,
        unitCost,
        totalCost: -quantity * unitCost,
        reason,
        issuedToEmployeeId: null,
        linkedMovementId: inMovementRef.id,
        performedBy: user.uid,
        ...newDocumentBaseFields(user.uid),
      })
      tx.set(inMovementRef, {
        itemId: item.ref.id,
        sizeVariant,
        outletId: destinationOutletId,
        movementType: 'transferIn',
        quantityDelta: quantity,
        unitCost,
        totalCost: quantity * unitCost,
        reason: notes || `Transfer from outlet ${sourceOutletId}`,
        issuedToEmployeeId: null,
        linkedMovementId: outMovementRef.id,
        performedBy: user.uid,
        ...newDocumentBaseFields(user.uid),
      })
    })

    await recordAuditEvent({
      eventType: 'StockTransferred',
      category: 'HR',
      module: 'hr',
      resourceType: 'stockMovement',
      resourceId: outMovementRef.id,
      action: 'create',
      user,
      newValues: { itemId: input.itemId, sourceOutletId, destinationOutletId, quantity },
    })

    return successResponse(
      { movementOutId: outMovementRef.id, movementInId: inMovementRef.id },
      'Stock transferred.',
    )
  } catch (error) {
    handleError(error)
  }
})
