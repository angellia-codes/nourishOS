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
import { createOffboardingChecklistInternal } from './offboarding'

interface ArchiveEmployeeInput {
  employeeId: string
  resignationDate: string
  resignationReason: string
  lastWorkingDate: string
}

/**
 * Soft-delete per HR_OPERATIONS.md E01-US03: the record leaves active
 * headcount but every historical field is preserved. Nothing here is ever
 * hard-deleted. Also the offboarding trigger point — employee-onboarding-exit-checklist.md
 * §5's OUT checklist is generated here, the same way hiring's ST-06 stage
 * generates the onboarding checklist.
 */
export const archiveEmployee = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_DELETE)

    const { employeeId, resignationDate, resignationReason, lastWorkingDate } = (request.data ?? {}) as Partial<ArchiveEmployeeInput>

    if (!employeeId || !resignationReason?.trim()) {
      throw new AppError('invalid-argument', 'employeeId and resignationReason are required.')
    }
    const parsedResignationDate = requireIsoDate(resignationDate, 'resignationDate')
    const parsedLastWorkingDate = requireIsoDate(lastWorkingDate, 'lastWorkingDate')
    if (parsedLastWorkingDate < parsedResignationDate) {
      throw new AppError('invalid-argument', 'lastWorkingDate cannot be before resignationDate.')
    }

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
      lastWorkingDate: parsedLastWorkingDate,
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

    const offboardingChecklistId = await createOffboardingChecklistInternal({
      employeeId,
      employeeName: employee.fullName as string,
      departmentId: employee.departmentId as string,
      outletId: employee.outletId as string,
      position: employee.position as string,
      lastWorkingDate: parsedLastWorkingDate,
      actorUid: user.uid,
    })

    return successResponse({ employeeId, offboardingChecklistId }, 'Employee archived.')
  } catch (error) {
    handleError(error)
  }
})

interface UnarchiveEmployeeInput {
  employeeId: string
  reason?: string
}

/**
 * Undoes archiveEmployee: restores active headcount status. The offboarding
 * checklist and any exit interview already on file are left exactly as they
 * are — they're history of what happened, not something reinstating someone
 * should erase, same "nothing is ever hard-deleted" reasoning archiveEmployee
 * itself states above. Separation fields are cleared since they no longer
 * describe this employee's current state; a later archive overwrites them
 * with fresh values anyway.
 */
export const unarchiveEmployee = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_DELETE)

    const { employeeId, reason } = (request.data ?? {}) as Partial<UnarchiveEmployeeInput>
    if (!employeeId) {
      throw new AppError('invalid-argument', 'employeeId is required.')
    }

    const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId)
    const snap = await employeeRef.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Employee not found.')
    }
    const employee = snap.data()!

    if (employee.status !== 'inactive') {
      throw new AppError('failed-precondition', 'This employee is already active.')
    }

    await employeeRef.update({
      status: 'active',
      isArchived: false,
      resignationDate: null,
      resignationReason: null,
      lastWorkingDate: null,
      ...updatedFields(user.uid),
    })

    await recordEmployeeActivity(
      { id: employeeId, departmentId: employee.departmentId, outletId: employee.outletId },
      'reactivated',
      reason?.trim() ? `Reinstated: ${reason.trim()}` : 'Reinstated to active headcount.',
      user,
    )

    await recordAuditEvent({
      eventType: 'EmployeeUnarchived',
      category: 'HR',
      module: 'hr',
      resourceType: 'employee',
      resourceId: employeeId,
      action: 'update',
      user,
      previousValues: { status: 'inactive' },
      newValues: { status: 'active' },
    })

    return successResponse({ employeeId }, 'Employee reinstated.')
  } catch (error) {
    handleError(error)
  }
})
