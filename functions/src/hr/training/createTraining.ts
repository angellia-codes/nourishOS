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
import { validateTrainingType } from './helpers'

interface CreateTrainingInput {
  title: string
  type: string
  description?: string
  mandatory: boolean
}

/** HR.md §11 Training Catalog. Curation shares one permission with assignment — HR only, same precedent as HR_INVENTORY_MANAGE. */
export const createTraining = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.TRAINING_ASSIGN)

    const input = (request.data ?? {}) as Partial<CreateTrainingInput>
    if (!input.title?.trim()) {
      throw new AppError('invalid-argument', 'title is required.')
    }
    const type = validateTrainingType(input.type)

    const ref = db.collection(COLLECTIONS.TRAININGS).doc()
    await ref.set({
      title: input.title.trim(),
      type,
      description: input.description?.trim() || null,
      mandatory: Boolean(input.mandatory),
      ...newDocumentBaseFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'TrainingCreated',
      category: 'HR',
      module: 'hr',
      resourceType: 'training',
      resourceId: ref.id,
      action: 'create',
      user,
      newValues: { title: input.title.trim(), type, mandatory: Boolean(input.mandatory) },
    })

    return successResponse({ trainingId: ref.id }, 'Training created.')
  } catch (error) {
    handleError(error)
  }
})
