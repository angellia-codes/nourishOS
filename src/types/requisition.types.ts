import type { BaseDocument } from './firestore.types'

/** employee-requisition.md §3/§4 — form enums (camelCase/snake mirror of the demo data). */
export type EmploymentType = 'ft' | 'fl' | 'dw' | 'ojt' | 'fixed_term'
export type RequisitionType = 'new_position' | 'replacement' | 'seasonal'
export type Urgency = 'normal' | 'urgent' | 'critical'

/**
 * `status` is the Approval Engine lifecycle (§2) — camelCase to match the
 * shipped approval convention (cf. ExpenseStatus), so it includes
 * `pendingApproval`/`returnedForRevision` rather than the demo's snake_case set.
 */
export type RequisitionStatus =
  | 'draft'
  | 'pendingApproval'
  | 'approved'
  | 'rejected'
  | 'returnedForRevision'
  | 'cancelled'
  | 'completed'

/** `vacancyStage` is recruitment-owned and only exists once status = approved (§2). */
export type VacancyStage = 'open' | 'sourcing' | 'interviewing' | 'offering' | 'filled' | 'closed'

/**
 * Employee Requisition — employee-requisition.md §4. Compensation (salary
 * range, Section C) is deferred for v1; only the `budgeted` routing flag is
 * stored. Attachments follow the repo convention (query `files`) — not inline.
 */
export interface Requisition extends BaseDocument {
  /** Auto-generated at submit: REQ-2026-0001. Null while still a draft. */
  requisitionNumber: string | null

  outletId: string
  departmentId: string
  positionId: string | null
  positionTitleFallback: string | null
  openings: number
  employmentType: EmploymentType
  contractMonths: number | null
  requisitionType: RequisitionType
  replacingEmployeeId: string | null
  targetJoinDate: string // ISO date
  urgency: Urgency
  justification: string
  responsibilities: string
  requirements: string
  workSchedule: string
  budgeted: boolean

  /** Overrides BaseDocument's generic status with this module's lifecycle. */
  status: RequisitionStatus
  vacancyStage: VacancyStage | null
  approvalRequestId: string | null

  requestedBy: string
  requestedByName: string
  hiredCandidateIds: string[]
  filledCount: number
  rejectionReason: string | null
}
