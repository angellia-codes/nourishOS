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
import { submitApprovalInternal } from '../../shared/approval/submitApproval'

/**
 * attendance.md §6.1 — moves a draft/rejected period onto the
 * 'people/attendancePeriod' approval chain. Mirrors
 * functions/src/hr/payroll/submitPayrollBatch.ts exactly.
 */
export const submitAttendancePeriod = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.ATTENDANCE_IMPORT)

    const { periodId } = (request.data ?? {}) as { periodId?: string }
    if (!periodId) {
      throw new AppError('invalid-argument', 'periodId is required.')
    }

    const ref = db.collection(COLLECTIONS.ATTENDANCE_PERIODS).doc(periodId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Attendance period not found.')
    }
    const period = snap.data()!

    if (period.status !== 'draft' && period.status !== 'rejected') {
      throw new AppError('failed-precondition', `A period in "${period.status as string}" cannot be submitted.`)
    }

    const approvalRequestId = await submitApprovalInternal({
      module: 'people',
      resourceType: 'attendancePeriod',
      resourceId: periodId,
      requestedBy: user.uid,
      priority: 'medium',
    })

    await ref.update({
      status: 'pendingApproval',
      approvalRequestId,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'AttendancePeriodSubmitted',
      category: 'HR',
      module: 'hr',
      resourceType: 'attendancePeriod',
      resourceId: periodId,
      action: 'submit',
      user,
      newValues: { approvalRequestId, period: period.period as string, recordCount: period.recordCount as number },
    })

    return successResponse({ approvalRequestId }, 'Attendance period submitted for approval.')
  } catch (error) {
    return handleError(error)
  }
})
