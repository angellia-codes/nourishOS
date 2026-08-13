import { db, COLLECTIONS } from '../../lib'

export type IncidentType =
  | 'customerComplaint'
  | 'foodSafety'
  | 'workplaceInjury'
  | 'equipmentFailure'
  | 'theft'
  | 'securityIncident'
  | 'utilityFailure'
  | 'nearMiss'

export type IncidentStatus = 'reported' | 'underReview' | 'investigating' | 'resolved' | 'closed' | 'reopened'

/**
 * incident-report.md §3 routes by TYPE to a ROLE, not a specific person
 * ("Engineering", "Security", "Outlet/Department Leader"). Simplified from
 * the doc's per-department "Department Leader" concept (which would need
 * resolving the reporter's specific kitchenLeader/barLeader/etc. role) down
 * to the single generic `outletManager` role — every outlet has exactly
 * one, so routing is unambiguous. foodSafety additionally CCs hrManager
 * (handled in createIncidentReport, not in this table).
 */
export const INCIDENT_ROUTING: Record<IncidentType, string> = {
  customerComplaint: 'outletManager',
  foodSafety: 'outletManager',
  workplaceInjury: 'hrManager',
  equipmentFailure: 'engineering',
  theft: 'security',
  securityIncident: 'security',
  utilityFailure: 'engineering',
  nearMiss: 'outletManager',
}

/** Forward transition per incident-report.md §8 updateIncidentStatus. */
export const INCIDENT_NEXT_STATUS: Partial<Record<IncidentStatus, IncidentStatus>> = {
  reported: 'underReview',
  underReview: 'investigating',
  investigating: 'resolved',
  resolved: 'closed',
  reopened: 'investigating',
}

/**
 * Next incident number, e.g. INC-2026-0001. Resets per year — same
 * transaction-counter shape as allocateEmployeeNumber / allocateLostFoundItemNumber.
 */
export async function allocateIncidentNumber(): Promise<string> {
  const year = new Date().getUTCFullYear()
  const key = `INC-${year}`
  const counterRef = db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc('incidentNumberSequences')

  const next = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const current = (snap.data()?.[key] as number | undefined) ?? 0
    const value = current + 1
    tx.set(counterRef, { [key]: value }, { merge: true })
    return value
  })

  return `${key}-${String(next).padStart(4, '0')}`
}

/** Active uids holding `role` — used to assign an investigation Task to a routed role (Task Engine needs real uids, not a role string). */
export async function getUidsForRole(role: string): Promise<string[]> {
  const snap = await db.collection(COLLECTIONS.USERS).where('roleId', '==', role).where('status', '==', 'active').get()
  return snap.docs.map((doc) => doc.id)
}
