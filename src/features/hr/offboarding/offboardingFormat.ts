import type { OffboardingTaskStatus, OffboardingTaskType, RoleTier } from './offboardingDemoData'

export { formatOnboardingDate } from '@/features/hr/onboarding/onboardingFormat'
export { TIER_LABELS, TIER_VARIANT, TREATMENT_LABELS, ITEM_STATUS_LABELS, ITEM_STATUS_VARIANT } from '@/features/hr/onboarding/onboardingFormat'

export const ROLE_TIER_LABELS: Record<RoleTier, string> = {
  floorStaff: 'Floor / Service Staff',
  backofficeOrSupervisorPlus: 'Backoffice / Supervisor+',
}

export const TASK_TYPE_LABELS: Record<OffboardingTaskType, string> = {
  assetAssignment: 'Asset Assignment',
  documentReview: 'Document Review',
  custom: 'Custom',
}

export const TASK_STATUS_LABELS: Record<OffboardingTaskStatus, string> = {
  pending: 'Pending',
  inProgress: 'In Progress',
  completed: 'Completed',
}

export const TASK_STATUS_VARIANT: Record<OffboardingTaskStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  pending: 'neutral',
  inProgress: 'warning',
  completed: 'success',
}
