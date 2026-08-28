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
  HR_STORE_ID,
  loadItemInTransaction,
  validateSizeVariant,
  validateOutletId,
  validateQuantity,
  readStockLevel,
  writeStockLevel,
  applyDelta,
} from './helpers'

const DESTINATION_TYPES = ['outlet', 'department'] as const
type DestinationType = (typeof DESTINATION_TYPES)[number]

interface TransferStockInput {
  itemId: string
  destinationType: DestinationType
  destinationId: string
  sizeVariant?: string
  quantity: number
  notes?: string
}

/**
 * Source is always HR_STORE_ID — transfer always moves stock out of the
 * central HR Store, never between arbitrary outlets. A 'department'
 * destination is a direct consumption record: HR Store decrements and one
 * transferOut movement carries issuedToDepartmentId, but no stock level is
 * created for the department (it has no trackable balance, unlike an
 * outlet). An 'outlet' destination keeps the original paired-ledger shape —
 * one transaction, two linked entries (transferOut at HR Store, transferIn
 * at the destination outlet) sharing a linkedMovementId.
 */
export const transferStock = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.HR_INVENTORY_RECORD)

    const input = (request.data ?? {}) as Partial<TransferStockInput>

    if (!DESTINATION_TYPES.includes(input.destinationType as DestinationType)) {
      throw new AppError('invalid-argument', `destinationType must be one of: ${DESTINATION_TYPES.join(', ')}.`)
    }
    const destinationType = input.destinationType as DestinationType
    const destinationId = validateOutletId(input.destinationId, 'destinationId')
    const sourceOutletId = HR_STORE_ID
    const quantity = validateQuantity(input.quantity)
    const notes = typeof input.notes === 'string' ? input.notes.trim() : ''

    const outMovementRef = db.collection(COLLECTIONS.HR_STOCK_MOVEMENTS).doc()
    const inMovementRef = destinationType === 'outlet' ? db.collection(COLLECTIONS.HR_STOCK_MOVEMENTS).doc() : null

    await db.runTransaction(async (tx) => {
      const item = await loadItemInTransaction(tx, input.itemId)
      const sizeVariant = validateSizeVariant(item.data, input.sizeVariant)

      // Both reads before either write — Firestore transactions forbid reads after writes.
      const sourceLevel = await readStockLevel(tx, item.ref.id, sourceOutletId, sizeVariant)
      const destLevel =
        destinationType === 'outlet' ? await readStockLevel(tx, item.ref.id, destinationId, sizeVariant) : null

      const sourceNext = applyDelta(sourceLevel.quantityOnHand, -quantity)
      writeStockLevel(tx, sourceLevel, { itemId: item.ref.id, outletId: sourceOutletId, sizeVariant }, sourceNext, user.uid)

      const unitCost = (item.data.unitCost as number) ?? 0

      if (destLevel) {
        const destNext = destLevel.quantityOnHand + quantity
        writeStockLevel(tx, destLevel, { itemId: item.ref.id, outletId: destinationId, sizeVariant }, destNext, user.uid)
      }

      tx.set(outMovementRef, {
        itemId: item.ref.id,
        sizeVariant,
        outletId: sourceOutletId,
        movementType: 'transferOut',
        quantityDelta: -quantity,
        unitCost,
        totalCost: -quantity * unitCost,
        reason: notes || `Transfer to ${destinationType} ${destinationId}`,
        issuedToEmployeeId: null,
        issuedToEmployeeName: null,
        issuedToDepartmentId: destinationType === 'department' ? destinationId : null,
        issuedToPosition: null,
        linkedMovementId: inMovementRef?.id ?? null,
        performedBy: user.uid,
        ...newDocumentBaseFields(user.uid),
      })
      if (inMovementRef) {
        tx.set(inMovementRef, {
          itemId: item.ref.id,
          sizeVariant,
          outletId: destinationId,
          movementType: 'transferIn',
          quantityDelta: quantity,
          unitCost,
          totalCost: quantity * unitCost,
          reason: notes || `Transfer from outlet ${sourceOutletId}`,
          issuedToEmployeeId: null,
          issuedToEmployeeName: null,
          issuedToDepartmentId: null,
          issuedToPosition: null,
          linkedMovementId: outMovementRef.id,
          performedBy: user.uid,
          ...newDocumentBaseFields(user.uid),
        })
      }
    })

    await recordAuditEvent({
      eventType: 'StockTransferred',
      category: 'HR',
      module: 'hr',
      resourceType: 'stockMovement',
      resourceId: outMovementRef.id,
      action: 'create',
      user,
      newValues: { itemId: input.itemId, sourceOutletId, destinationType, destinationId, quantity },
    })

    return successResponse(
      { movementOutId: outMovementRef.id, movementInId: inMovementRef?.id ?? null },
      'Stock transferred.',
    )
  } catch (error) {
    handleError(error)
  }
})
