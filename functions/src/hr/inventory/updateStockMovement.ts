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
import {
  loadItemInTransaction,
  validateSizeVariant,
  validateQuantity,
  applyLevelDeltas,
  type LevelDelta,
} from './helpers'

interface UpdateStockMovementInput {
  movementId: string
  quantity: number
  sizeVariant?: string | null
  reason: string
  employeeId?: string | null
}

/**
 * Corrects a mis-keyed movement in place — wrong quantity, wrong size, wrong
 * recipient — reversing the original stock effect and applying the new one in
 * the same transaction, so the ledger and the on-hand levels can never
 * disagree. Same hrInventory.manage gate as voidStockMovement, and for the
 * same reason.
 *
 * Deliberately a full replacement, not a partial patch: the callable wire
 * format encodes an absent key as null (firebase-js-sdk's serializer), so
 * "omitted" and "explicitly cleared" are indistinguishable server-side. The
 * edit form always submits every editable field.
 *
 * unitCost is NOT re-snapshotted from the item — StockMovement.unitCost is the
 * cost at movement time and is deliberately not retroactive, so an item
 * repriced since then must not rewrite history. totalCost is recomputed from
 * the stored unitCost so the two stay consistent.
 *
 * Transfers are rejected: they are a paired ledger entry across two outlets,
 * so an edit would have to rewrite both legs and both destination levels.
 * Void the pair and record a fresh transfer instead.
 */
export const updateStockMovement = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.HR_INVENTORY_MANAGE)

    const input = (request.data ?? {}) as Partial<UpdateStockMovementInput>
    if (typeof input.movementId !== 'string' || !input.movementId) {
      throw new AppError('invalid-argument', 'movementId is required.')
    }
    const movementId = input.movementId
    const quantity = validateQuantity(input.quantity)
    const reason = typeof input.reason === 'string' ? input.reason.trim() : ''
    if (!reason) {
      throw new AppError('invalid-argument', 'reason is required.')
    }

    const movementRef = db.collection(COLLECTIONS.HR_STOCK_MOVEMENTS).doc(movementId)
    let previousValues: Record<string, unknown> = {}
    let changes: Record<string, unknown> = {}

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(movementRef)
      if (!snap.exists) {
        throw new AppError('not-found', 'That stock movement no longer exists.')
      }
      const data = snap.data() as Record<string, unknown>
      if (data.isVoided) {
        throw new AppError('failed-precondition', 'That movement is voided and can no longer be edited.')
      }
      const movementType = data.movementType as string
      if (movementType === 'transferOut' || movementType === 'transferIn') {
        throw new AppError(
          'failed-precondition',
          'A transfer is a paired ledger entry — void it and record a new transfer instead.',
        )
      }

      const item = await loadItemInTransaction(tx, data.itemId)
      const newSize = validateSizeVariant(item.data, input.sizeVariant ?? null)
      const oldSize = (data.sizeVariant as string | null) ?? null
      const outletId = data.outletId as string

      // Sign is a property of the movement type (issue is negative, receive
      // positive), never of the submitted quantity — the form only edits magnitude.
      const oldDelta = (data.quantityDelta as number) ?? 0
      const newDelta = oldDelta < 0 ? -quantity : quantity

      // Re-snapshot the recipient only for a movement that already had one;
      // a write-off or adjustment has no employee to reassign.
      const hadEmployee = typeof data.issuedToEmployeeId === 'string' && data.issuedToEmployeeId !== ''
      const wantsEmployee = typeof input.employeeId === 'string' && input.employeeId !== ''
      if (wantsEmployee && !hadEmployee) {
        throw new AppError('failed-precondition', 'This movement was not issued to an employee.')
      }
      if (hadEmployee && !wantsEmployee) {
        throw new AppError('invalid-argument', 'employeeId is required for an employee issue.')
      }

      const employeeFields: Record<string, unknown> = {}
      if (wantsEmployee && input.employeeId !== data.issuedToEmployeeId) {
        const employeeSnap = await tx.get(db.collection(COLLECTIONS.EMPLOYEES).doc(input.employeeId as string))
        const employeeData = employeeSnap.data()
        if (!employeeSnap.exists || employeeData?.status !== 'active') {
          throw new AppError('failed-precondition', 'employeeId must refer to an active employee.')
        }
        employeeFields.issuedToEmployeeId = input.employeeId
        employeeFields.issuedToEmployeeName = (employeeData?.fullName as string) ?? null
        employeeFields.issuedToDepartmentId = (employeeData?.departmentId as string) ?? null
        employeeFields.issuedToPosition = (employeeData?.position as string) ?? null
      }

      const itemId = item.ref.id
      const deltas: LevelDelta[] = [
        { itemId, outletId, sizeVariant: oldSize, delta: -oldDelta },
        { itemId, outletId, sizeVariant: newSize, delta: newDelta },
      ]
      await applyLevelDeltas(tx, deltas, user.uid)

      const unitCost = (data.unitCost as number) ?? 0
      changes = {
        sizeVariant: newSize,
        quantityDelta: newDelta,
        totalCost: newDelta * unitCost,
        reason,
        ...employeeFields,
      }
      previousValues = {}
      for (const key of Object.keys(changes)) previousValues[key] = data[key] ?? null

      tx.update(movementRef, { ...changes, ...updatedFields(user.uid) })
    })

    await recordAuditEvent({
      eventType: 'StockMovementUpdated',
      category: 'HR',
      module: 'hr',
      resourceType: 'stockMovement',
      resourceId: movementId,
      action: 'update',
      user,
      previousValues,
      newValues: changes,
    })

    return successResponse({ movementId }, 'Movement updated.')
  } catch (error) {
    handleError(error)
  }
})
