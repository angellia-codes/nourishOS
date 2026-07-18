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
import { notifyUsersByRole, sendNotificationInternal } from '../../shared/notifications'

// employee-disciplinary-action.md §5 — draft → underReview and notify all four
// acknowledgment parties (§7). employeeStatement is mandatory to leave draft
// (AC-1, the form's "WAJIB DIISI"). Creator (or disciplinary.manage) may submit.
export const submitDisciplinaryAction = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.DISCIPLINARY_CREATE)

    const { actionId } = (request.data ?? {}) as { actionId?: string }
    if (!actionId) {
      throw new AppError('invalid-argument', 'actionId is required.')
    }

    const actionRef = db.collection(COLLECTIONS.DISCIPLINARY_ACTIONS).doc(actionId)
    const snap = await actionRef.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Disciplinary action not found.')
    }
    const action = snap.data()!

    const canManage = user.permissions.includes(PERMISSIONS.DISCIPLINARY_MANAGE)
    if (action.createdBy !== user.uid && !canManage) {
      throw new AppError('permission-denied', 'Only the author or HR can submit this disciplinary action.')
    }
    if (action.status !== 'draft') {
      throw new AppError('failed-precondition', `This disciplinary action is already ${action.status}.`)
    }
    if (!action.employeeStatement?.trim()) {
      throw new AppError('failed-precondition', "The employee's statement must be filled before submitting (WAJIB DIISI).")
    }

    await actionRef.update({ status: 'underReview', ...updatedFields(user.uid) })

    // Notify the acknowledgment parties (§7 — all four, immediately). The
    // subject employee is reached via an email→user lookup since the Employee
    // record has no uid link; if they have no app account, the in-person
    // signature flow still records their acknowledgment.
    const title = 'Disciplinary Action Awaiting Your Acknowledgment'
    const message = `${action.actionNumber} for ${action.employeeName} needs your acknowledgment.`
    for (const role of ['hrManager', 'generalManager', 'outletManager']) {
      await notifyUsersByRole({ role, module: 'disciplinary', title, message, referenceId: actionId })
    }
    const employeeSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(action.employeeId).get()
    const employeeEmail = employeeSnap.data()?.email as string | undefined
    if (employeeEmail) {
      const userMatch = await db.collection(COLLECTIONS.USERS).where('email', '==', employeeEmail).limit(1).get()
      if (!userMatch.empty) {
        await sendNotificationInternal({
          type: 'alert',
          title,
          message: `${action.actionNumber} concerning you needs your acknowledgment.`,
          module: 'disciplinary',
          priority: 'high',
          recipientUid: userMatch.docs[0].id,
          referenceModule: 'disciplinary',
          referenceId: actionId,
        })
      }
    }

    await recordAuditEvent({
      eventType: 'DisciplinaryActionSubmitted',
      category: 'HR',
      module: 'disciplinary',
      resourceType: 'disciplinaryAction',
      resourceId: actionId,
      action: 'submit',
      user,
      newValues: { status: 'underReview' },
    })

    return successResponse({ actionId }, 'Disciplinary action submitted for acknowledgment.')
  } catch (error) {
    handleError(error)
  }
})
