import { BookOpen, CheckCircle2, Lock, XCircle, GraduationCap, type LucideIcon } from 'lucide-react'
import type { StatusTone } from '@/components/ui'
import type {
  BilingualText,
  TrainingAssignmentStatus,
  TrainingBinding,
  TrainingPhase,
  TrainingRecurrenceType,
} from '@/types'

/**
 * training-module-spec-v1.0.md §D3 — mirror of
 * `functions/src/hr/training/trainingCatalog.ts`. The app's own department
 * vocabulary stayed as-is; the master sheet's 11 departments are reached
 * through this map. Keep both copies in sync by hand, the same known
 * duplication collections.ts and permissions.ts carry.
 */
export const TRAINING_DEPARTMENT_BY_ORG: Record<string, string | null> = {
  bar: 'dept-bar',
  fb_service: 'dept-fandb-service',
  kitchen: 'dept-kitchen',
  cashier: 'dept-cashier',
  wholefood_retail: 'dept-wholesale',
  security: 'dept-security',
  human_resources: 'dept-human-resources',
  finance_accounting: 'dept-finance-and-accounting',
  driver: 'dept-driver',
  engineering_pomec: 'dept-engineering',
  central_kitchen: 'dept-bakery-kitchen',
  admin_general: null,
  sales_marketing: null,
  housekeeping: null,
}

/** `kitchen` means bakery production at The Bakery Kitchen and restaurant kitchen everywhere else. */
export function resolveTrainingDepartment(
  departmentId: string | null | undefined,
  outletId: string | null | undefined,
): string | null {
  if (!departmentId) return null
  if (departmentId === 'kitchen' && outletId === 'the_bakery_kitchen') return 'dept-bakery-kitchen'
  return TRAINING_DEPARTMENT_BY_ORG[departmentId] ?? null
}

/** O4 is still open — all 197 imported topics have `title.id === null`, so English is what renders. */
export function bilingual(text: BilingualText | undefined | null): string {
  return text?.en ?? '—'
}

export const PHASE_LABELS: Record<TrainingPhase, string> = {
  onboarding: 'Onboarding',
  upskilling: 'Upskilling',
}

/** §3 — phase collapsed four perfectly collinear sheet columns; this is the half worth showing on a row. */
export const PHASE_HINT: Record<TrainingPhase, string> = {
  onboarding: 'Mandatory · assessed',
  upskilling: 'Optional · not assessed',
}

export const ASSIGNMENT_STATUS_LABELS: Record<TrainingAssignmentStatus, string> = {
  locked: 'Locked',
  assigned: 'Assigned',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const ASSIGNMENT_STATUS_TONE: Record<TrainingAssignmentStatus, StatusTone> = {
  locked: 'neutral',
  assigned: 'info',
  completed: 'success',
  cancelled: 'closed',
}

export const ASSIGNMENT_STATUS_ICON: Record<TrainingAssignmentStatus, LucideIcon> = {
  locked: Lock,
  assigned: BookOpen,
  completed: CheckCircle2,
  cancelled: XCircle,
}

export const PASSED_ICON: LucideIcon = GraduationCap

/** "45 min" / "1h 30m" — durations come from the sheet in minutes, five distinct values. */
export function formatDuration(minutes: number | undefined): string {
  if (!minutes) return '—'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

export const RECURRENCE_LABELS: Record<TrainingRecurrenceType, string> = {
  none: 'Once',
  interval: 'Repeats',
  manual: 'On request',
}

/** The sheet's original frequency wording, preserved verbatim at ingestion (§3). */
export function recurrenceSummary(binding: TrainingBinding): string {
  const { type, intervalMonths, recurrenceNote } = binding.recurrence
  if (recurrenceNote) return recurrenceNote
  if (type === 'interval' && intervalMonths) return `Every ${intervalMonths} month${intervalMonths === 1 ? '' : 's'}`
  return RECURRENCE_LABELS[type]
}

/** Why a locked row is locked — the trainee's most common question. */
export function lockReason(
  binding: TrainingBinding | undefined,
  titleFor: (topicId: string) => string,
  completedTopicIds: Set<string>,
): string {
  if (!binding) return 'Locked'
  const missing = binding.prerequisiteTopicIds.filter((topicId) => !completedTopicIds.has(topicId))
  if (missing.length > 0) return `Needs first: ${missing.map(titleFor).join(', ')}`
  if (binding.allCoreTopics) return 'Needs every onboarding topic in your department completed'
  if (binding.minTenureMonths) return `Opens after ${binding.minTenureMonths} months of service`
  return 'Locked'
}
