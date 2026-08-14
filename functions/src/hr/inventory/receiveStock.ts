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
  type MovementType,
  loadItemInTransaction,
  validateSizeVariant,
  validateOutletId,
  validateQuantity,
  readStockLevel,
  writeStockLevel,
  applyDelta,
} from './helpers'

const REASON_CODES = ['supplierReceipt', 'employeeReturn', 'adjustment'] as const
type ReasonCode = (typeof REASON_CODES)[number]

const MOVEMENT_TYPE: Record<ReasonCode, MovementType> = {
  supplierReceipt: 'receive',
  employeeReturn: 'return',
  adjustment: 'adjustment',
}

const DEFAULT_LABEL: Record<ReasonCode, string> = {
  supplierReceipt: 'Supplier receipt',
  employeeReturn: 'Employee return',
  adjustment: 'Stock adjustment',
}

interface ReceiveStockInput {
  itemId: string
  outletId: string
  sizeVariant?: string
  quantity: number
  reasonCode: ReasonCode
  notes?: string
}

/** Always increases quantityOnHand. Adjustments require a stated reason since they have no other paper trail. */
export const receiveStock = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.HR_INVENTORY_RECORD)

    const input = (request.data ?? {}) as Partial<ReceiveStockInput>

    if (!REASON_CODES.includes(input.reasonCode as ReasonCode)) {
      throw new AppError('invalid-argument', `reasonCode must be one of: ${REASON_CODES.join(', ')}.`)
    }
    const reasonCode = input.reasonCode as ReasonCode
    const outletId = validateOutletId(input.outletId)
    const quantity = validateQuantity(input.quantity)
    const notes = typeof input.notes === 'string' ? input.notes.trim() : ''
    if (reasonCode === 'adjustment' && !notes) {
      throw new AppError('invalid-argument', 'notes is required for a stock adjustment.')
    }

    const movementRef = db.collection(COLLECTIONS.HR_STOCK_MOVEMENTS).doc()

    await db.runTransaction(async (tx) => {
      const item = await loadItemInTransaction(tx, input.itemId)
      const sizeVariant = validateSizeVariant(item.data, input.sizeVariant)
      const level = await readStockLevel(tx, item.ref.id, outletId, sizeVariant)

      const next = applyDelta(level.quantityOnHand, quantity)
      writeStockLevel(tx, level, { itemId: item.ref.id, outletId, sizeVariant }, next, user.uid)

      const unitCost = (item.data.unitCost as number) ?? 0
      tx.set(movementRef, {
        itemId: item.ref.id,
        sizeVariant,
        outletId,
        movementType: MOVEMENT_TYPE[reasonCode],
        quantityDelta: quantity,
        unitCost,
        totalCost: quantity * unitCost,
        reason: notes || DEFAULT_LABEL[reasonCode],
        issuedToEmployeeId: null,
        linkedMovementId: null,
        performedBy: user.uid,
        ...newDocumentBaseFields(user.uid),
      })
    })

    await recordAuditEvent({
      eventType: 'StockReceived',
      category: 'HR',
      module: 'hr',
      resourceType: 'stockMovement',
      resourceId: movementRef.id,
      action: 'create',
      user,
      newValues: { itemId: input.itemId, outletId, quantity, reasonCode },
    })

    return successResponse({ movementId: movementRef.id }, 'Stock received.')
  } catch (error) {
    handleError(error)
  }
})
