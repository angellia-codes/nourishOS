import { AppError, allocateYearlyNumber, requirePermission, type AuthedUser } from '../../lib'
import { DEPARTMENT_ROLES, OUTLET_DEPARTMENTS } from '../../lib/organization'

/**
 * requirePermission, but superAdmin always passes. `roles/superAdmin` was
 * seeded by hand before these permission strings existed (see lib/rbac.ts), so
 * a plain permission check would lock the one account that can fix everything
 * else out of a brand-new module.
 */
export function requireRecruitmentPermission(user: AuthedUser, permission: string): void {
  if (user.roleId === 'superAdmin') return
  requirePermission(user, permission)
}

/** True when the caller may act across outlets and on other people's requisitions. */
export function isRecruitmentManager(user: AuthedUser): boolean {
  return user.roleId === 'superAdmin' || user.permissions.includes('recruitment.update')
}

/** Mirrors src/types/recruitment.types.ts (known frontend/functions duplication — keep in sync). */
export const REQUISITION_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'completed',
  'cancelled',
] as const
export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number]

export const EMPLOYMENT_TYPES = ['ft', 'fl', 'dw', 'ojt', 'fixed_term'] as const
export const REQUISITION_TYPES = ['new_position', 'replacement', 'seasonal'] as const
export const URGENCIES = ['normal', 'urgent', 'critical'] as const

/** HR_OPERATIONS.md §9.4 — ST-01 … ST-08. */
export const CANDIDATE_STAGES = ['ST-01', 'ST-02', 'ST-03', 'ST-04', 'ST-05', 'ST-06', 'ST-07', 'ST-08'] as const
export type CandidateStage = (typeof CANDIDATE_STAGES)[number]

export const STAGE_LABELS: Record<CandidateStage, string> = {
  'ST-01': 'Applied',
  'ST-02': 'Screening',
  'ST-03': 'HR Interview',
  'ST-04': 'User Interview',
  'ST-05': 'Offering',
  'ST-06': 'Hired',
  'ST-07': 'Rejected',
  'ST-08': 'Withdrawn',
}

/**
 * Which stages a candidate may move to from where. Forward one step along the
 * happy path, or out to Rejected/Withdrawn from anywhere still live — the
 * pipeline is a funnel, so skipping an interview stage or resurrecting a
 * rejected candidate has to be a deliberate new record, not a board drag.
 * Hired/Rejected/Withdrawn are terminal.
 */
export const ALLOWED_STAGE_TRANSITIONS: Record<CandidateStage, readonly CandidateStage[]> = {
  'ST-01': ['ST-02', 'ST-07', 'ST-08'],
  'ST-02': ['ST-03', 'ST-07', 'ST-08'],
  'ST-03': ['ST-04', 'ST-05', 'ST-07', 'ST-08'],
  'ST-04': ['ST-05', 'ST-07', 'ST-08'],
  'ST-05': ['ST-06', 'ST-07', 'ST-08'],
  'ST-06': [],
  'ST-07': [],
  'ST-08': [],
}

export const CANDIDATE_SOURCES = [
  'jobPortal',
  'referral',
  'socialMedia',
  'broadcast',
  'newspaperAd',
  'appliedDirectly',
  'otherAdvertisement',
  'employmentAgency',
  'other',
] as const

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Validates a 'YYYY-MM-DD' civil-date string — same contract as hr/employees/helpers.ts. */
export function requireIsoDate(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    throw new AppError('invalid-argument', `${fieldName} must be a valid YYYY-MM-DD date.`)
  }
  return value
}

/** Trims, enforces presence and a max length. Returns the trimmed value. */
export function requireText(value: unknown, fieldName: string, maxLength: number): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) {
    throw new AppError('invalid-argument', `${fieldName} is required.`)
  }
  if (text.length > maxLength) {
    throw new AppError('invalid-argument', `${fieldName} must be ${maxLength} characters or fewer.`)
  }
  return text
}

export function requireOneOf<T extends string>(value: unknown, allowed: readonly T[], fieldName: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new AppError('invalid-argument', `${fieldName} must be one of: ${allowed.join(', ')}.`)
  }
  return value as T
}

/** The org chart is the source of truth for both — same check registerUser makes. */
export function requireOutletAndDepartment(outletId: unknown, departmentId: unknown): {
  outletId: string
  departmentId: string
} {
  const outlet = typeof outletId === 'string' ? outletId.trim() : ''
  const departments = OUTLET_DEPARTMENTS[outlet]
  if (!departments) {
    throw new AppError('invalid-argument', 'Select a valid outlet.')
  }

  const department = typeof departmentId === 'string' ? departmentId.trim() : ''
  if (!DEPARTMENT_ROLES[department]) {
    throw new AppError('invalid-argument', 'Select a valid department.')
  }
  if (!departments.includes(department)) {
    throw new AppError('invalid-argument', 'That department does not exist at the selected outlet.')
  }

  return { outletId: outlet, departmentId: department }
}

/** REQ-2026-0042 — employee-requisition.md §3 Section A. */
export function allocateRequisitionNumber(): Promise<string> {
  return allocateYearlyNumber('requisitionNumberSequences', 'REQ')
}

/** C-2026-0007 — HR_OPERATIONS.md 9.4-F02. */
export function allocateCandidateNumber(): Promise<string> {
  return allocateYearlyNumber('candidateNumberSequences', 'C')
}
