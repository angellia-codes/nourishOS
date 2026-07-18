import { db, COLLECTIONS, AppError } from '../../lib'

// employee-requisition.md §3/§4 — enum keys mirrored client-side in
// src/features/hr/recruitment/employeeRequisitionDemoData.ts.
export const EMPLOYMENT_TYPES = ['ft', 'fl', 'dw', 'ojt', 'fixed_term'] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export const REQUISITION_TYPES = ['new_position', 'replacement', 'seasonal'] as const
export type RequisitionType = (typeof REQUISITION_TYPES)[number]

export const URGENCIES = ['normal', 'urgent', 'critical'] as const
export type Urgency = (typeof URGENCIES)[number]

export interface RequisitionInput {
  positionId?: string | null
  positionTitleFallback?: string
  openings?: number
  employmentType?: EmploymentType
  contractMonths?: number
  requisitionType?: RequisitionType
  replacingEmployeeId?: string
  targetJoinDate?: string
  urgency?: Urgency
  justification?: string
  responsibilities?: string
  requirements?: string
  workSchedule?: string
  budgeted?: boolean
}

/**
 * Validates the requisition form (employee-requisition.md §3 Sections A–B) and
 * returns the cleaned, storable shape. Throws AppError on any invalid field.
 * Compensation (Section C salary range) is deliberately out of scope for v1 —
 * only the `budgeted` routing flag is captured. `positionId` OR a free-text
 * `positionTitleFallback` is required (§3: free-text fallback flagged for HR).
 */
export function validateRequisition(input: RequisitionInput) {
  const req = (msg: string, ok: unknown) => {
    if (!ok) throw new AppError('invalid-argument', msg)
  }

  req('A position or a position title is required.', input.positionId || input.positionTitleFallback?.trim())
  req('openings must be at least 1.', typeof input.openings === 'number' && input.openings >= 1)
  req('A valid employmentType is required.', input.employmentType && EMPLOYMENT_TYPES.includes(input.employmentType))
  req('A valid requisitionType is required.', input.requisitionType && REQUISITION_TYPES.includes(input.requisitionType))
  req('A valid urgency is required.', input.urgency && URGENCIES.includes(input.urgency))
  req('targetJoinDate is required.', input.targetJoinDate)
  req('justification is required.', input.justification?.trim())
  req('responsibilities is required.', input.responsibilities?.trim())
  req('requirements is required.', input.requirements?.trim())
  req('workSchedule is required.', input.workSchedule?.trim())
  req('budgeted must be specified.', typeof input.budgeted === 'boolean')

  if (input.employmentType === 'fixed_term') {
    req('contractMonths is required for a fixed-term requisition.', typeof input.contractMonths === 'number' && input.contractMonths >= 1)
  }
  if (input.requisitionType === 'replacement') {
    req('replacingEmployeeId is required for a replacement requisition.', input.replacingEmployeeId)
  }

  return {
    positionId: input.positionId || null,
    positionTitleFallback: input.positionId ? null : input.positionTitleFallback!.trim(),
    openings: input.openings!,
    employmentType: input.employmentType!,
    contractMonths: input.employmentType === 'fixed_term' ? input.contractMonths! : null,
    requisitionType: input.requisitionType!,
    replacingEmployeeId: input.requisitionType === 'replacement' ? input.replacingEmployeeId! : null,
    targetJoinDate: input.targetJoinDate!,
    urgency: input.urgency!,
    justification: input.justification!.trim(),
    responsibilities: input.responsibilities!.trim(),
    requirements: input.requirements!.trim(),
    workSchedule: input.workSchedule!.trim(),
    budgeted: input.budgeted!,
  }
}

/**
 * Next requisition number, e.g. REQ-2026-0001. Resets per year — same
 * transaction-counter shape as allocateExpenseRequestNumber (AC-5: unique,
 * sequential per year).
 */
export async function allocateRequisitionNumber(): Promise<string> {
  const year = new Date().getUTCFullYear()
  const key = `REQ-${year}`
  const counterRef = db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc('requisitionNumberSequences')

  const next = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const current = (snap.data()?.[key] as number | undefined) ?? 0
    const value = current + 1
    tx.set(counterRef, { [key]: value }, { merge: true })
    return value
  })

  return `${key}-${String(next).padStart(4, '0')}`
}
