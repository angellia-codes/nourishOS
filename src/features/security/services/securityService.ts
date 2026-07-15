import { orderBy, where } from 'firebase/firestore'
import { callFunction } from '@/services/api'
import { queryDocuments, getDocument, subscribeToCollection } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Checkpoint, PatrolLog } from '@/types'
import type { Unsubscribe } from 'firebase/firestore'

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
  latitude: number
  longitude: number
  geofenceRadiusMeters: number
  scheduleIntervalMinutes: number
}

/** Supervisor-only — checkpoint registration doesn't have an admin UI yet; call this from the emulator shell or a future Settings screen. */
export function createCheckpoint(input: CreateCheckpointInput): Promise<{ checkpointId: string }> {
  return callFunction('createCheckpoint', input)
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
