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
import { requireIsoDate } from '../employees/helpers'

interface AssignTrainingInput {
  trainingId: string
  employeeIds: string[]
  dueDate?: string
}

/**
 * Writes one trainingAssignments doc per employee. Independent inserts, no
 * transaction needed. Unknown employeeIds and employees who already have an
 * uncompleted assignment for this training are skipped rather than failing
 * the whole batch — same partial-success shape importEmployees uses.
 */
export const assignTraining = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.TRAINING_ASSIGN)

    const input = (request.data ?? {}) as Partial<AssignTrainingInput>
    const trainingId = input.trainingId?.trim() ?? ''
    if (!trainingId) {
      throw new AppError('invalid-argument', 'trainingId is required.')
    }
    const employeeIds = Array.isArray(input.employeeIds)
      ? [...new Set(input.employeeIds.filter((id): id is string => typeof id === 'string' && id.trim() !== ''))]
      : []
    if (employeeIds.length === 0) {
      throw new AppError('invalid-argument', 'At least one employeeId is required.')
    }
    const dueDate = input.dueDate ? requireIsoDate(input.dueDate, 'dueDate') : null

    const trainingSnap = await db.collection(COLLECTIONS.TRAININGS).doc(trainingId).get()
    if (!trainingSnap.exists) {
      throw new AppError('not-found', 'Training not found.')
    }

    const assignmentIds: string[] = []
    for (const employeeId of employeeIds) {
      const employeeSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId).get()
      if (!employeeSnap.exists) continue

      const existing = await db
        .collection(COLLECTIONS.TRAINING_ASSIGNMENTS)
        .where('trainingId', '==', trainingId)
        .where('employeeId', '==', employeeId)
        .where('status', '==', 'assigned')
        .limit(1)
        .get()
      if (!existing.empty) continue

      const employee = employeeSnap.data()!
      const ref = db.collection(COLLECTIONS.TRAINING_ASSIGNMENTS).doc()
      await ref.set({
        trainingId,
        employeeId,
        dueDate,
        departmentId: employee.departmentId ?? null,
        outletId: employee.outletId ?? null,
        ...newDocumentBaseFields(user.uid, 'assigned'),
      })
      assignmentIds.push(ref.id)
    }

    await recordAuditEvent({
      eventType: 'TrainingAssigned',
      category: 'HR',
      module: 'hr',
      resourceType: 'training',
      resourceId: trainingId,
      action: 'assign',
      user,
      newValues: { employeeIds, dueDate },
    })

    return successResponse({ assignmentIds }, 'Training assigned.')
  } catch (error) {
    handleError(error)
  }
})
