import type { Timestamp } from 'firebase/firestore'
import type { BaseDocument } from './firestore.types'
import type { Priority } from '@/constants/statuses'

/** incident-report.md §5 — incidentType. */
export type IncidentType =
  | 'customerComplaint'
  | 'foodSafety'
  | 'workplaceInjury'
  | 'equipmentFailure'
  | 'theft'
  | 'securityIncident'
  | 'utilityFailure'
  | 'nearMiss'

/** incident-report.md §5 — module-specific lifecycle. */
export type IncidentStatus = 'reported' | 'underReview' | 'investigating' | 'resolved' | 'closed' | 'reopened'

export interface IncidentPerson {
  name: string
  role: 'employee' | 'customer' | 'vendor' | 'other'
  employeeId?: string
}

export interface IncidentWitness {
  name: string
  contact?: string
}

/**
 * incident-report.md §5. Two deliberate deviations from the doc schema:
 * - No `attachments: string[]` — matches the repo-wide convention (see
 *   LostFoundItem) of querying `files` by resourceType/resourceId instead
 *   of storing references inline.
 * - `assignedToRole` (a role string) instead of `assignedTo` (a single
 *   uid) — §3's routing table routes to a ROLE ("Engineering", "Security"),
 *   not a specific person; picking one arbitrary uid from that role would
 *   be arbitrary and wrong. Rules/queries key off the role instead.
 */
export interface IncidentReport extends BaseDocument {
  /** Auto-generated server-side: INC-2026-0001. */
  incidentNumber: string

  title: string
  description: string
  incidentType: IncidentType
  severity: Priority
  location: string
  /** When it happened — 'YYYY-MM-DDTHH:mm', distinct from createdAt (when reported). */
  occurredAt: string

  peopleInvolved: IncidentPerson[]
  witnesses: IncidentWitness[]
  immediateActionTaken: string
  emergencyServicesCalled: boolean

  reportedBy: string // uid
  /** Routed per §3's type table (see helpers.ts INCIDENT_ROUTING). */
  assignedToRole: string
  investigationTaskId?: string | null
  linkedWorkOrderId?: string | null

  /** Overrides BaseDocument's generic status with this module's lifecycle. */
  status: IncidentStatus
  resolutionSummary?: string | null
  resolvedAt?: Timestamp | null
  resolvedBy?: string | null
  reopenReason?: string | null
}
