import type { ChecklistItemStatus, ChecklistTier, ChecklistTreatment } from './onboardingDemoData'

export { formatRequisitionDate as formatOnboardingDate } from '@/features/hr/recruitment/employeeRequisitionFormat'
// employment-application-form.md §2 — one canonical source enum + labels, owned by the recruitment demo module.
export { CANDIDATE_SOURCE_LABELS as RECRUITMENT_SOURCE_LABELS } from '@/features/hr/recruitment/candidatePipelineFormat'

export const TIER_LABELS: Record<ChecklistTier, string> = {
  mandatory: 'Mandatory',
  followUp: 'Mandatory — may follow up',
  optional: 'Optional',
  process: 'Process step',
}

export const TIER_VARIANT: Record<ChecklistTier, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  mandatory: 'error',
  followUp: 'warning',
  optional: 'neutral',
  process: 'info',
}

export const TREATMENT_LABELS: Record<ChecklistTreatment, string> = {
  collect: 'Collect',
  verify: 'Verify',
  generate: 'Generate',
  notDigitized: 'Not digitized',
}

export const ITEM_STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  pending: 'Pending',
  received: 'Received',
  notApplicable: 'Not applicable',
}

export const ITEM_STATUS_VARIANT: Record<ChecklistItemStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  pending: 'neutral',
  received: 'success',
  notApplicable: 'neutral',
}

export const EMPLOYEE_STATUS_FIELD_LABELS: Record<'ft' | 'dw', string> = {
  ft: 'Staff (Full-Time)',
  dw: 'Daily Worker',
}

export const CHECKLIST_TIER_ORDER: ChecklistTier[] = ['mandatory', 'followUp', 'optional', 'process']
