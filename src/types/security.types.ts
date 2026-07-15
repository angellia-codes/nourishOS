import type { BaseDocument } from './firestore.types'

export interface GeoCoordinates {
  latitude: number
  longitude: number
  /** Meters — from the device's own GPS accuracy report, not a guess. */
  accuracy: number
}

/**
 * A predefined patrol point. Registered lat/long + a geofence radius are
 * the source of truth the server checks every submitted patrol against —
 * the client's own distance calculation is UX preview only.
 */
export interface Checkpoint extends BaseDocument {
  name: string
  description?: string
  latitude: number
  longitude: number
  /** How close a submitted patrol must be to count as "at" this checkpoint. */
  geofenceRadiusMeters: number
  /** Expected visit frequency — drives the overdue-alert scheduled function. */
  scheduleIntervalMinutes: number
  lastVisitedAt?: Date | null
  lastVisitedBy?: string | null
}

/**
 * One guard's visit to one checkpoint. Photo evidence is NOT referenced
 * here — it's a separate `files` doc keyed by resourceType:'patrolLog',
 * resourceId:<this doc's id>, same pattern as Appraisal attachments.
 */
export interface PatrolLog extends BaseDocument {
  checkpointId: string
  checkpointName: string // denormalized for display without a second read
  guardId: string
  latitude: number
  longitude: number
  accuracyMeters: number | null
  distanceFromCheckpointMeters: number
  withinGeofence: boolean
  notes?: string
  /** Overrides BaseDocument's generic `status` with the specific workflow values this module uses. */
  status: 'completed' | 'flagged'
}
