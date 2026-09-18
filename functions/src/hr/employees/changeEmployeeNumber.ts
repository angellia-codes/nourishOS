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
  EMPLOYEE_NUMBER_EDITOR_ROLES,
  EMPLOYMENT_STATUSES,
  allocateEmployeeNumber,
  assertEmployeeNumberUnique,
  parseEmployeeNumber,
  raiseEmployeeNumberSequence,
  recordEmployeeActivity,
  type EmploymentStatus,
} from './helpers'

interface ChangeEmployeeNumberInput {
  employeeId: string
  /**
   * The new number, e.g. 'N-0087'. Omit it to have the server allocate the
   * next free number for the employee's current employmentStatus prefix —
   * which is the promotion case (dailyWorker DW-0004 → staff N-00xx).
   */
  employeeNumber?: string | null
  /** Why — free text, shown on the profile timeline and kept in the audit log. */
  reason?: string
}

/**
 * HR_OPERATIONS.md 9.1-F02 — the employee number is allocated at hire from
 * the employment-status prefix (N / DW / OJT), which means it stops being
 * correct the moment someone moves between those statuses: a Daily Worker
 * promoted to staff keeps a DW- number that no longer describes them, and a
 * migration typo has no other way to be corrected.
 *
 * So the number is no longer immutable, but it is not an ordinary profile
 * field either — it identifies the person on payslips, contracts and the
 * payroll/attendance CSV joins (functions/src/hr/payroll/context.ts,
 * functions/src/hr/attendance/context.ts both resolve rows by this field).
 * It therefore gets its own callable rather than a seat in updateEmployee's
 * whitelist, restricted to Super Admin / Jr. HR Manager / HR & General Admin
 * (RBAC.md §4 — the role check is the narrower of the two gates; the
 * permission check below is what a role document can actually revoke).
 *
 * Deliberately NOT rewritten: the employeeNumber already denormalized onto
 * issued payslips, attendance records and communication records. Those are
 * snapshots of what the document said when it was issued — history, not a
 * live reference. Only files imported from here on need the new number.
 */
export const changeEmployeeNumber = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_UPDATE)
    // superAdmin bypasses requirePermission entirely (rbac.ts), so it is named
    // here explicitly rather than assumed to have fallen through above.
    if (!EMPLOYEE_NUMBER_EDITOR_ROLES.includes(user.roleId)) {
      throw new AppError('permission-denied', 'Only Super Admin, Jr. HR Manager and HR & General Admin can change an employee number.')
    }

    const { employeeId, employeeNumber, reason } = (request.data ?? {}) as Partial<ChangeEmployeeNumberInput>
    if (!employeeId || typeof employeeId !== 'string') {
      throw new AppError('invalid-argument', 'employeeId is required.')
    }
    if (employeeNumber !== undefined && employeeNumber !== null && typeof employeeNumber !== 'string') {
      throw new AppError('invalid-argument', 'employeeNumber must be a string or null.')
    }
    if (reason !== undefined && typeof reason !== 'string') {
      throw new AppError('invalid-argument', 'reason must be a string.')
    }

    const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId)
    const snap = await employeeRef.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Employee not found.')
    }
    const existing = snap.data() as Record<string, unknown>
    const previousNumber = (existing.employeeNumber as string | undefined) ?? null

    const requested = typeof employeeNumber === 'string' ? employeeNumber.trim().toUpperCase() : ''

    let nextNumber: string
    if (requested) {
      const { prefix, sequence } = parseEmployeeNumber(requested)
      if (requested === previousNumber) {
        throw new AppError('invalid-argument', 'That is already this employee\'s number.')
      }
      await assertEmployeeNumberUnique(requested, employeeId)
      // Claim the number against the counter before writing it, so a hire
      // landing a second later cannot be handed the same one.
      await raiseEmployeeNumberSequence(prefix, sequence)
      nextNumber = requested
    } else {
      const status = existing.employmentStatus as EmploymentStatus
      if (!EMPLOYMENT_STATUSES.includes(status)) {
        throw new AppError(
          'failed-precondition',
          'This employee has no valid employment status, so a number cannot be allocated automatically. Enter one by hand.',
        )
      }
      nextNumber = await allocateEmployeeNumber(status)
      // allocateEmployeeNumber only ever hands out a fresh sequence value, but
      // a hand-entered number from before this callable existed could already
      // be sitting on that value.
      await assertEmployeeNumberUnique(nextNumber, employeeId)
    }

    await employeeRef.update({ employeeNumber: nextNumber, ...updatedFields(user.uid) })

    const trailer = reason?.trim() ? ` — ${reason.trim()}` : ''
    await recordEmployeeActivity(
      { id: employeeId, departmentId: existing.departmentId as string, outletId: existing.outletId as string },
      'employeeNumberChanged',
      `Employee number changed from ${previousNumber ?? '(none)'} to ${nextNumber}${trailer}.`,
      user,
    )

    await recordAuditEvent({
      eventType: 'EmployeeNumberChanged',
      category: 'HR',
      module: 'hr',
      resourceType: 'employee',
      resourceId: employeeId,
      action: 'update',
      user,
      previousValues: { employeeNumber: previousNumber },
      newValues: { employeeNumber: nextNumber, reason: reason?.trim() || null },
    })

    return successResponse({ employeeId, employeeNumber: nextNumber }, `Employee number changed to ${nextNumber}.`)
  } catch (error) {
    handleError(error)
  }
})
