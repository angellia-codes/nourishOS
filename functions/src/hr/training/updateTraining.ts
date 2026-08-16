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
import { validateTrainingType } from './helpers'

interface UpdateTrainingInput {
  trainingId: string
  title?: string
  type?: string
  description?: string
  mandatory?: boolean
  isArchived?: boolean
}

export const updateTraining = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.TRAINING_ASSIGN)

    const input = (request.data ?? {}) as Partial<UpdateTrainingInput>
    const trainingId = input.trainingId?.trim() ?? ''
    if (!trainingId) {
      throw new AppError('invalid-argument', 'trainingId is required.')
    }

    const ref = db.collection(COLLECTIONS.TRAININGS).doc(trainingId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Training not found.')
    }

    const changes: Record<string, unknown> = {}
    if (input.title !== undefined) {
      if (!input.title.trim()) {
        throw new AppError('invalid-argument', 'title cannot be empty.')
      }
      changes.title = input.title.trim()
    }
    if (input.type !== undefined) {
      changes.type = validateTrainingType(input.type)
    }
    if (input.description !== undefined) {
      changes.description = input.description.trim() || null
    }
    if (input.mandatory !== undefined) {
      changes.mandatory = Boolean(input.mandatory)
    }
    if (input.isArchived !== undefined) {
      changes.isArchived = Boolean(input.isArchived)
    }

    if (Object.keys(changes).length === 0) {
      throw new AppError('invalid-argument', 'No updatable fields were provided.')
    }

    await ref.update({ ...changes, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'TrainingUpdated',
      category: 'HR',
      module: 'hr',
      resourceType: 'training',
      resourceId: trainingId,
      action: 'update',
      user,
      newValues: changes,
    })

    return successResponse({ trainingId }, 'Training updated.')
  } catch (error) {
    handleError(error)
  }
})
