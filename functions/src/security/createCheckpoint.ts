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
} from '../lib'

interface CreateCheckpointInput {
  name: string
  description?: string
  latitude: number
  longitude: number
  geofenceRadiusMeters: number
  scheduleIntervalMinutes: number
}

export const createCheckpoint = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.CHECKPOINTS_MANAGE)

    const input = (request.data ?? {}) as Partial<CreateCheckpointInput>

    if (
      !input.name ||
      typeof input.latitude !== 'number' ||
      typeof input.longitude !== 'number' ||
      typeof input.geofenceRadiusMeters !== 'number' ||
      typeof input.scheduleIntervalMinutes !== 'number'
    ) {
      throw new AppError(
        'invalid-argument',
        'name, latitude, longitude, geofenceRadiusMeters, and scheduleIntervalMinutes are required.',
      )
    }
    if (input.geofenceRadiusMeters <= 0 || input.scheduleIntervalMinutes <= 0) {
      throw new AppError('invalid-argument', 'geofenceRadiusMeters and scheduleIntervalMinutes must be positive.')
    }

    const checkpointRef = db.collection(COLLECTIONS.CHECKPOINTS).doc()
    await checkpointRef.set({
      name: input.name,
      description: input.description ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
      geofenceRadiusMeters: input.geofenceRadiusMeters,
      scheduleIntervalMinutes: input.scheduleIntervalMinutes,
      lastVisitedAt: null,
      lastVisitedBy: null,
      lastAlertedAt: null,
      ...newDocumentBaseFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'CheckpointCreated',
      category: 'Security',
      module: 'security',
      resourceType: 'checkpoint',
      resourceId: checkpointRef.id,
      action: 'create',
      user,
      newValues: { name: input.name },
    })

    return successResponse({ checkpointId: checkpointRef.id }, 'Checkpoint created.')
  } catch (error) {
    handleError(error)
  }
})
