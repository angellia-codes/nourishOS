import { callFunction } from '@/services/api'
import { getDocument, queryDocuments, subscribeToCollection, where, orderBy, limit } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type {
  AparChecklistKey,
  AparItemResult,
  AparResolution,
  ExtinguisherType,
  FireExtinguisher,
  FireExtinguisherInspection,
  Task,
} from '@/types'
import type { Unsubscribe } from '@/services/firestore'

export interface ExtinguisherFormInput {
  outletId: string
  departmentId: string
  locationLabel: string
  extinguisherType: ExtinguisherType
  weightKg: number
  serialNumber?: string
  manufactureDate?: string
  installedAt: string
  expiryDate: string
  lastRefillDate?: string
  nextHydrostaticTestDate?: string
}

/** Server allocates the assetCode — the client never sends or edits one (§4.2). */
export function registerFireExtinguisher(
  input: ExtinguisherFormInput,
): Promise<{ extinguisherId: string; assetCode: string }> {
  return callFunction('registerFireExtinguisher', input)
}

/** `outletId` is ignored server-side on an edit: the assetCode encodes the outlet, so a move is a retire-and-re-register. */
export function updateFireExtinguisher(
  input: ExtinguisherFormInput & { extinguisherId: string },
): Promise<{ extinguisherId: string }> {
  return callFunction('updateFireExtinguisher', input)
}

export function retireFireExtinguisher(extinguisherId: string, reason: string): Promise<{ extinguisherId: string }> {
  return callFunction('retireFireExtinguisher', { extinguisherId, reason })
}

export interface SubmitAparInspectionInput {
  roundTaskId: string
  extinguisherId: string
  items: {
    key: AparChecklistKey
    result: AparItemResult
    note?: string | null
    photoFileId?: string | null
    resolution?: AparResolution | null
  }[]
  remarks?: string
}

export interface SubmitAparInspectionResult {
  inspectionId: string
  overallResult: 'pass' | 'failResolved' | 'failNeedsService'
  workOrderId: string | null
  roundCompleted: boolean
}

export function submitAparInspection(input: SubmitAparInspectionInput): Promise<SubmitAparInspectionResult> {
  return callFunction('submitAparInspection', input)
}

export function getFireExtinguisher(extinguisherId: string): Promise<FireExtinguisher | null> {
  return getDocument<FireExtinguisher>(COLLECTIONS.FIRE_EXTINGUISHERS, extinguisherId)
}

/**
 * The whole live register. Outlet filtering is client-side on purpose — a
 * company this size holds dozens of cylinders, not thousands, and a second
 * composite index buys nothing.
 */
export function subscribeToRegister(onChange: (units: FireExtinguisher[]) => void): Unsubscribe {
  return subscribeToCollection<FireExtinguisher>(
    COLLECTIONS.FIRE_EXTINGUISHERS,
    [where('isArchived', '==', false), orderBy('assetCode', 'asc')],
    onChange,
  )
}

/** §5.1 — the round reads the register live, so a unit registered mid-month appears in it. */
export function getOutletRegister(outletId: string): Promise<FireExtinguisher[]> {
  return queryDocuments<FireExtinguisher>(COLLECTIONS.FIRE_EXTINGUISHERS, [
    where('outletId', '==', outletId),
    where('isArchived', '==', false),
  ])
}

/** §9.2 — the unit timeline. */
export function getInspectionsForUnit(extinguisherId: string): Promise<FireExtinguisherInspection[]> {
  return queryDocuments<FireExtinguisherInspection>(COLLECTIONS.FIRE_EXTINGUISHER_INSPECTIONS, [
    where('extinguisherId', '==', extinguisherId),
    orderBy('periodMonth', 'desc'),
  ])
}

/** Everything already recorded in one round — drives the "9 of 14" progress line. */
export function getInspectionsForPeriod(
  outletId: string,
  periodMonth: string,
): Promise<FireExtinguisherInspection[]> {
  return queryDocuments<FireExtinguisherInspection>(COLLECTIONS.FIRE_EXTINGUISHER_INSPECTIONS, [
    where('outletId', '==', outletId),
    where('periodMonth', '==', periodMonth),
  ])
}

export function getRoundTask(taskId: string): Promise<Task | null> {
  return getDocument<Task>(COLLECTIONS.TASKS, taskId)
}

/**
 * This month's round for an outlet, found by the deterministic referenceId the
 * generator writes. One equality filter, so no index — assignment is checked in
 * the caller rather than with an array-contains filter that would need one.
 */
export async function findRoundTask(referenceId: string): Promise<Task | null> {
  const tasks = await queryDocuments<Task>(COLLECTIONS.TASKS, [where('referenceId', '==', referenceId), limit(1)])
  return tasks[0] ?? null
}
