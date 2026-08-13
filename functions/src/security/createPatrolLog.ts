import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  haversineDistanceMeters,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../lib'
import { notifyUsersByRole } from '../shared/notifications'

interface CreatePatrolLogInput {
  checkpointId: string
  latitude: number
  longitude: number
  accuracy?: number
  notes?: string
}

/**
 * Flags out-of-range submissions rather than rejecting them outright.
 * Indoor/urban GPS drift of 20-40m+ is common and a hard reject would
 * mean a guard who is genuinely on-site can't complete their round. A
 * flagged entry still counts as a completed patrol but alerts a
 * supervisor for review — gets the oversight without the false negatives.
 */
export const createPatrolLog = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.PATROLS_CREATE)

    const { checkpointId, latitude, longitude, accuracy, notes } = (request.data ?? {}) as Partial<CreatePatrolLogInput>

    if (!checkpointId || typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new AppError('invalid-argument', 'checkpointId, latitude, and longitude are required.')
    }

    const checkpointRef = db.collection(COLLECTIONS.CHECKPOINTS).doc(checkpointId)
    const checkpointSnap = await checkpointRef.get()
    if (!checkpointSnap.exists) {
      throw new AppError('not-found', 'Checkpoint not found.')
    }
    const checkpoint = checkpointSnap.data()!

    const distanceMeters = haversineDistanceMeters(latitude, longitude, checkpoint.latitude, checkpoint.longitude)
    const withinGeofence = distanceMeters <= checkpoint.geofenceRadiusMeters

    const logRef = db.collection(COLLECTIONS.PATROL_LOGS).doc()
    await logRef.set({
      checkpointId,
      checkpointName: checkpoint.name,
      guardId: user.uid,
      latitude,
      longitude,
      accuracyMeters: accuracy ?? null,
      distanceFromCheckpointMeters: Math.round(distanceMeters),
      withinGeofence,
      notes: notes?.trim() || null,
      ...newDocumentBaseFields(user.uid, withinGeofence ? 'completed' : 'flagged'),
    })

    await checkpointRef.update({
      lastVisitedAt: FieldValue.serverTimestamp(),
      lastVisitedBy: user.uid,
      // Reset the alert cooldown now that the checkpoint has actually been visited.
      lastAlertedAt: null,
    })

    if (!withinGeofence) {
      await notifyUsersByRole({
        role: 'generalManager',
        module: 'security',
        title: 'Patrol Flagged — Outside Geofence',
        message: `${user.displayName || 'A guard'}'s patrol at "${checkpoint.name}" was logged ${Math.round(
          distanceMeters,
        )}m from the checkpoint (limit: ${checkpoint.geofenceRadiusMeters}m).`,
        referenceId: logRef.id,
        priority: 'high',
      })
    }

    await recordAuditEvent({
      eventType: 'PatrolLogged',
      category: 'Security',
      module: 'security',
      resourceType: 'patrolLog',
      resourceId: logRef.id,
      action: 'create',
      user,
      severity: withinGeofence ? 'informational' : 'medium',
      newValues: { checkpointId, distanceMeters: Math.round(distanceMeters), withinGeofence },
    })

    return successResponse(
      { patrolLogId: logRef.id, withinGeofence, distanceMeters: Math.round(distanceMeters) },
      withinGeofence
        ? 'Patrol logged.'
        : 'Patrol logged, but you appear to be outside the checkpoint radius. Flagged for review.',
    )
  } catch (error) {
    handleError(error)
  }
})
