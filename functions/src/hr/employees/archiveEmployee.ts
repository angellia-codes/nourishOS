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
import { recordEmployeeActivity, requireIsoDate } from './helpers'

interface ArchiveEmployeeInput {
  employeeId: string
  resignationDate: string
  resignationReason: string
}

/**
 * Soft-delete per HR_OPERATIONS.md E01-US03: the record leaves active
 * headcount but every historical field is preserved. Nothing here is ever
 * hard-deleted.
 */
export const archiveEmployee = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_DELETE)

    const { employeeId, resignationDate, resignationReason } = (request.data ?? {}) as Partial<ArchiveEmployeeInput>

    if (!employeeId || !resignationReason?.trim()) {
      throw new AppError('invalid-argument', 'employeeId and resignationReason are required.')
    }
    const parsedResignationDate = requireIsoDate(resignationDate, 'resignationDate')

    const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId)
    const snap = await employeeRef.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Employee not found.')
    }
    const employee = snap.data()!

    if (employee.status !== 'active') {
      throw new AppError('failed-precondition', 'This employee is already archived.')
    }
    if (parsedResignationDate < (employee.joinDate as string)) {
      throw new AppError('invalid-argument', 'resignationDate cannot be before joinDate.')
    }

    await employeeRef.update({
      status: 'inactive',
      isArchived: true,
      resignationDate: parsedResignationDate,
      resignationReason: resignationReason.trim(),
      ...updatedFields(user.uid),
    })

    await recordEmployeeActivity(
      { id: employeeId, departmentId: employee.departmentId, outletId: employee.outletId },
      'archived',
      `Archived — resigned ${parsedResignationDate}: ${resignationReason.trim()}`,
      user,
    )

    await recordAuditEvent({
      eventType: 'EmployeeArchived',
      category: 'HR',
      module: 'hr',
      resourceType: 'employee',
      resourceId: employeeId,
      action: 'delete',
      user,
      previousValues: { status: 'active' },
      newValues: { status: 'inactive', resignationDate: parsedResignationDate, resignationReason: resignationReason.trim() },
    })

    return successResponse({ employeeId }, 'Employee archived.')
  } catch (error) {
    handleError(error)
  }
})
