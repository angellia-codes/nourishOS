import { AppError } from '../lib'
import { OUTLET_DEPARTMENTS } from '../lib/organization'

/**
 * Checkpoint field validation, shared by createCheckpoint and updateCheckpoint
 * so the two can never drift — same reason sopLibrary.ts has one validateFields
 * for its create/update pair.
 *
 * Deliberately absent: lastVisitedAt / lastVisitedBy / lastAlertedAt. Those are
 * patrol state, owned by createPatrolLog and checkOverdueCheckpoints; an admin
 * editing a checkpoint's radius must not be able to rewrite when it was last
 * walked.
 */
// A `type`, not an `interface`: only type aliases get an implicit index
// signature, which is what recordAuditEvent's Record<string, unknown> needs.
export type CheckpointFields = {
  name: string
  description: string | null
  outletId: string
  latitude: number
  longitude: number
  geofenceRadiusMeters: number
  scheduleIntervalMinutes: number
}

export function validateCheckpointFields(input: Record<string, unknown>): CheckpointFields {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const { latitude, longitude, geofenceRadiusMeters, scheduleIntervalMinutes, outletId } = input

  if (
    !name ||
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    typeof geofenceRadiusMeters !== 'number' ||
    typeof scheduleIntervalMinutes !== 'number'
  ) {
    throw new AppError(
      'invalid-argument',
      'name, latitude, longitude, geofenceRadiusMeters, and scheduleIntervalMinutes are required.',
    )
  }
  // OUTLET_DEPARTMENTS's keys are the canonical outlet-id set (see submitShiftReport
  // for the same validation) — checkpoints have no department, so only the outlet
  // half of that map is used.
  if (typeof outletId !== 'string' || !OUTLET_DEPARTMENTS[outletId]) {
    throw new AppError('invalid-argument', 'Select a valid outlet.')
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new AppError('invalid-argument', 'latitude must be between -90 and 90.')
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new AppError('invalid-argument', 'longitude must be between -180 and 180.')
  }
  if (geofenceRadiusMeters <= 0 || scheduleIntervalMinutes <= 0) {
    throw new AppError('invalid-argument', 'geofenceRadiusMeters and scheduleIntervalMinutes must be positive.')
  }

  return {
    name,
    description: typeof input.description === 'string' && input.description.trim() ? input.description.trim() : null,
    outletId,
    latitude,
    longitude,
    geofenceRadiusMeters,
    scheduleIntervalMinutes,
  }
}

/** The subset of a checkpoint worth recording in an audit event's previousValues. */
export function auditSnapshot(previous: FirebaseFirestore.DocumentData) {
  return {
    name: previous.name,
    outletId: previous.outletId,
    latitude: previous.latitude,
    longitude: previous.longitude,
    geofenceRadiusMeters: previous.geofenceRadiusMeters,
    scheduleIntervalMinutes: previous.scheduleIntervalMinutes,
  }
}
