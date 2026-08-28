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
  HR_STORE_ID,
  loadItemInTransaction,
  validateSizeVariant,
  validateQuantity,
  readStockLevel,
  writeStockLevel,
  applyDelta,
} from './helpers'

const REASON_CODES = ['employeeIssue', 'writeOff', 'adjustment'] as const
type ReasonCode = (typeof REASON_CODES)[number]

const MOVEMENT_TYPE: Record<ReasonCode, MovementType> = {
  employeeIssue: 'issue',
  writeOff: 'adjustment',
  adjustment: 'adjustment',
}

const DEFAULT_LABEL: Record<ReasonCode, string> = {
  employeeIssue: 'Issued to employee',
  writeOff: 'Write-off',
  adjustment: 'Stock adjustment',
}

interface IssueStockInput {
  itemId: string
  sizeVariant?: string
  quantity: number
  reasonCode: ReasonCode
  employeeId?: string
  notes?: string
}

/**
 * Always decreases quantityOnHand at HR_STORE_ID — issue always draws from
 * the central HR Store, never a client-picked outlet. Rejects if it would go
 * negative. Loss and write-off reasons require a stated notes, same as
 * receiveStock's adjustment branch — an employee issue is self-documenting
 * via employeeId instead.
 */
export const issueStock = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.HR_INVENTORY_RECORD)

    const input = (request.data ?? {}) as Partial<IssueStockInput>

    if (!REASON_CODES.includes(input.reasonCode as ReasonCode)) {
      throw new AppError('invalid-argument', `reasonCode must be one of: ${REASON_CODES.join(', ')}.`)
    }
    const reasonCode = input.reasonCode as ReasonCode
    const outletId = HR_STORE_ID
    const quantity = validateQuantity(input.quantity)
    const notes = typeof input.notes === 'string' ? input.notes.trim() : ''

    let employeeId: string | null = null
    let employeeName: string | null = null
    let employeeDepartmentId: string | null = null
    let employeePosition: string | null = null
    if (reasonCode === 'employeeIssue') {
      if (!input.employeeId) {
        throw new AppError('invalid-argument', 'employeeId is required when reasonCode is employeeIssue.')
      }
      const employeeSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(input.employeeId).get()
      const employeeData = employeeSnap.data()
      if (!employeeSnap.exists || employeeData?.status !== 'active') {
        throw new AppError('failed-precondition', 'employeeId must refer to an active employee.')
      }
      employeeId = input.employeeId
      employeeName = (employeeData?.fullName as string) ?? null
      employeeDepartmentId = (employeeData?.departmentId as string) ?? null
      employeePosition = (employeeData?.position as string) ?? null
    } else if (!notes) {
      throw new AppError('invalid-argument', 'notes is required for a write-off or adjustment.')
    }

    const movementRef = db.collection(COLLECTIONS.HR_STOCK_MOVEMENTS).doc()

    await db.runTransaction(async (tx) => {
      const item = await loadItemInTransaction(tx, input.itemId)
      const sizeVariant = validateSizeVariant(item.data, input.sizeVariant)
      const level = await readStockLevel(tx, item.ref.id, outletId, sizeVariant)

      const next = applyDelta(level.quantityOnHand, -quantity)
      writeStockLevel(tx, level, { itemId: item.ref.id, outletId, sizeVariant }, next, user.uid)

      const unitCost = (item.data.unitCost as number) ?? 0
      tx.set(movementRef, {
        itemId: item.ref.id,
        sizeVariant,
        outletId,
        movementType: MOVEMENT_TYPE[reasonCode],
        quantityDelta: -quantity,
        unitCost,
        totalCost: -quantity * unitCost,
        reason: notes || DEFAULT_LABEL[reasonCode],
        issuedToEmployeeId: employeeId,
        issuedToEmployeeName: employeeName,
        issuedToDepartmentId: employeeDepartmentId,
        issuedToPosition: employeePosition,
        linkedMovementId: null,
        performedBy: user.uid,
        ...newDocumentBaseFields(user.uid),
      })
    })

    await recordAuditEvent({
      eventType: 'StockIssued',
      category: 'HR',
      module: 'hr',
      resourceType: 'stockMovement',
      resourceId: movementRef.id,
      action: 'create',
      user,
      newValues: { itemId: input.itemId, outletId, quantity, reasonCode, employeeId },
    })

    return successResponse({ movementId: movementRef.id }, 'Stock issued.')
  } catch (error) {
    handleError(error)
  }
})
