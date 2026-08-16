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

interface CompleteTrainingInput {
  assignmentId: string
}

/**
 * Certificates attach via the existing generic FileUpload/FileList pattern
 * (resourceType: 'trainingCertificate', resourceId: assignmentId) — no
 * certificateFileId param needed here, same as the Contract Document card.
 */
export const completeTraining = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.TRAINING_ASSIGN)

    const { assignmentId } = (request.data ?? {}) as Partial<CompleteTrainingInput>
    if (!assignmentId?.trim()) {
      throw new AppError('invalid-argument', 'assignmentId is required.')
    }

    const ref = db.collection(COLLECTIONS.TRAINING_ASSIGNMENTS).doc(assignmentId.trim())
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Training assignment not found.')
    }
    const assignment = snap.data()!
    if (assignment.status === 'completed') {
      throw new AppError('failed-precondition', 'This assignment is already marked complete.')
    }

    await ref.update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      ...updatedFields(user.uid),
    })

    const employeeSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(assignment.employeeId as string).get()
    if (employeeSnap.exists) {
      const trainingSnap = await db.collection(COLLECTIONS.TRAININGS).doc(assignment.trainingId as string).get()
      const trainingTitle = trainingSnap.exists ? (trainingSnap.data()!.title as string) : 'training'
      const employee = employeeSnap.data()!
      await recordEmployeeActivity(
        { id: employeeSnap.id, departmentId: employee.departmentId as string, outletId: employee.outletId as string },
        'trainingCompleted',
        `Completed training: ${trainingTitle}.`,
        user,
      )
    }

    await recordAuditEvent({
      eventType: 'TrainingCompleted',
      category: 'HR',
      module: 'hr',
      resourceType: 'trainingAssignment',
      resourceId: assignmentId.trim(),
      action: 'update',
      user,
      newValues: { status: 'completed' },
    })

    return successResponse({ assignmentId: assignmentId.trim() }, 'Training marked complete.')
  } catch (error) {
    handleError(error)
  }
})
