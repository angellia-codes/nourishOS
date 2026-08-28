import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
  todayIso,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { dueDateFor } from './trainingCatalog'

/**
 * training-module-spec-v1.0.md D6 — HR forces a locked topic open.
 *
 * The reason is mandatory and both it and `overrideByUid` are written to the
 * assignment as well as the audit log: a gate that can be stepped over
 * silently is not a gate, and this is the only record that the prerequisite
 * was skipped rather than met.
 */
export const overrideTrainingGate = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.TRAINING_MANAGE)

    const { assignmentId, reason } = (request.data ?? {}) as { assignmentId?: string; reason?: string }
    const id = typeof assignmentId === 'string' ? assignmentId.trim() : ''
    const overrideReason = typeof reason === 'string' ? reason.trim() : ''
    if (!id || !overrideReason) {
      throw new AppError('invalid-argument', 'assignmentId and a reason are required.')
    }

    const ref = db.collection(COLLECTIONS.TRAINING_ASSIGNMENTS).doc(id)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That training assignment no longer exists.')
    }
    const assignment = snap.data()!
    if (assignment.status !== 'locked') {
      throw new AppError('failed-precondition', `That assignment is already ${assignment.status as string}.`)
    }

    const bindingSnap = await db.collection(COLLECTIONS.TRAINING_BINDINGS).doc(assignment.bindingId as string).get()
    const recurrenceType = (bindingSnap.data()?.recurrence?.type as 'none' | 'interval' | 'manual') ?? 'none'
    const issuedOn = todayIso()

    await ref.update({
      status: 'assigned',
      assignedAt: issuedOn,
      dueAt: dueDateFor(recurrenceType, issuedOn),
      overrideReason,
      overrideByUid: user.uid,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'TrainingGateOverridden',
      category: 'HR',
      module: 'hr',
      resourceType: 'trainingAssignment',
      resourceId: id,
      action: 'update',
      user,
      severity: 'medium',
      previousValues: { status: 'locked' },
      newValues: { status: 'assigned', employeeId: assignment.employeeId, topicId: assignment.topicId, overrideReason },
    })

    return successResponse({ assignmentId: id }, 'Gate overridden — the topic is now assigned.')
  } catch (error) {
    return handleError(error)
  }
})
