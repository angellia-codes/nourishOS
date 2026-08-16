import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
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
import { recordEmployeeActivity } from '../employees/helpers'

interface TerminateContractInput {
  employeeId: string
  terminationReason: string
}

/**
 * Closes out the employee's current active contract row. Deliberately does
 * NOT touch Employee.status — ending employment itself still goes through
 * the existing archiveEmployee flow. A terminated contract isn't necessarily
 * a departure (a new one can follow via renewContract); confirmed design
 * decision, not an oversight.
 */
export const terminateContract = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_UPDATE)

    const input = (request.data ?? {}) as Partial<TerminateContractInput>
    const employeeId = input.employeeId?.trim() ?? ''
    if (!employeeId) {
      throw new AppError('invalid-argument', 'employeeId is required.')
    }
    const terminationReason = input.terminationReason?.trim() ?? ''
    if (!terminationReason) {
      throw new AppError('invalid-argument', 'A termination reason is required.')
    }

    const employeeSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId).get()
    if (!employeeSnap.exists) {
      throw new AppError('not-found', 'Employee not found.')
    }

    const activeSnap = await db
      .collection(COLLECTIONS.CONTRACTS)
      .where('employeeId', '==', employeeId)
      .where('status', '==', 'active')
      .limit(1)
      .get()
    if (activeSnap.empty) {
      throw new AppError('failed-precondition', 'This employee has no active contract to terminate.')
    }

    const contractRef = activeSnap.docs[0].ref
    await contractRef.update({
      terminationReason,
      terminatedAt: FieldValue.serverTimestamp(),
      status: 'terminated',
      ...updatedFields(user.uid),
    })

    const employee = employeeSnap.data()!
    await recordEmployeeActivity(
      { id: employeeId, departmentId: employee.departmentId as string, outletId: employee.outletId as string },
      'contractTerminated',
      `Contract terminated: ${terminationReason}.`,
      user,
    )

    await recordAuditEvent({
      eventType: 'ContractTerminated',
      category: 'HR',
      module: 'hr',
      resourceType: 'contract',
      resourceId: contractRef.id,
      action: 'update',
      user,
      newValues: { status: 'terminated', terminationReason },
    })

    return successResponse({ contractId: contractRef.id }, 'Contract terminated.')
  } catch (error) {
    handleError(error)
  }
})
