import { callFunction } from '@/services/api'
import { queryDocuments, getDocument, subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Checkpoint, PatrolLog } from '@/types'
import type { Unsubscribe } from '@/services/firestore'

export interface CreatePatrolLogInput {
  checkpointId: string
  latitude: number
  longitude: number
  accuracy: number
  notes?: string
}

export interface CreatePatrolLogResult {
  patrolLogId: string
  withinGeofence: boolean
  distanceMeters: number
}

export function createPatrolLog(input: CreatePatrolLogInput): Promise<CreatePatrolLogResult> {
  return callFunction('createPatrolLog', input)
}

export interface CreateCheckpointInput {
  name: string
  description?: string
  outletId: string
  latitude: number
  longitude: number
  geofenceRadiusMeters: number
  scheduleIntervalMinutes: number
}

/** All three gated on `security.manageCheckpoints` server-side — see security-control-point.md §6. */
export function createCheckpoint(input: CreateCheckpointInput): Promise<{ checkpointId: string }> {
  return callFunction('createCheckpoint', input)
}

export function updateCheckpoint(
  input: CreateCheckpointInput & { checkpointId: string },
): Promise<{ checkpointId: string }> {
  return callFunction('updateCheckpoint', input)
}

/**
 * Soft archive — drops the checkpoint out of the guard's list and the overdue
 * sweep while patrolLogs keep resolving its name. Reversible server-side.
 */
export function archiveCheckpoint(checkpointId: string): Promise<{ checkpointId: string }> {
  return callFunction('archiveCheckpoint', { checkpointId })
}

export function getCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
  return getDocument<Checkpoint>(COLLECTIONS.CHECKPOINTS, checkpointId)
}

export function getActiveCheckpoints(): Promise<Checkpoint[]> {
  return queryDocuments<Checkpoint>(COLLECTIONS.CHECKPOINTS, [
    where('isArchived', '==', false),
    orderBy('name', 'asc'),
  ])
}

export function subscribeToActiveCheckpoints(onChange: (checkpoints: Checkpoint[]) => void): Unsubscribe {
  return subscribeToCollection<Checkpoint>(
    COLLECTIONS.CHECKPOINTS,
    [where('isArchived', '==', false), orderBy('name', 'asc')],
    onChange,
  )
}

export function getMyPatrolLogs(guardId: string): Promise<PatrolLog[]> {
  return queryDocuments<PatrolLog>(COLLECTIONS.PATROL_LOGS, [
    where('guardId', '==', guardId),
    orderBy('createdAt', 'desc'),
  ])
}
