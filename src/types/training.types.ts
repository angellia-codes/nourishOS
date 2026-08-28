import type { BaseDocument } from './firestore.types'
import type { TrainingType } from '@/constants/hr'

/** Bilingual label pair as the master sheet ingestion produced it — every `id` is null until O4's translation pass. */
export interface BilingualText {
  en: string
  id: string | null
}

export type TrainingPhase = 'onboarding' | 'upskilling'
export type TrainingDeliveryMode = 'trainer' | 'digital'
export type TrainingRecurrenceType = 'none' | 'interval' | 'manual'

/**
 * training-module-spec-v1.0.md §4.2 — canonical content, department-agnostic.
 * Completion is recorded against this id, which is what makes a department
 * transfer non-destructive (§D2).
 */
export interface TrainingTopic extends BaseDocument {
  title: BilingualText
  phase: TrainingPhase
  durationMinutes: number
  deliveryMode: TrainingDeliveryMode
  assessmentRequired: boolean
  sourceMaterial: string
  sharedAcrossDepartments: boolean
  /** Digital-mode material — null on all 197 imported topics (§8). */
  contentRef: string | null
}

/** §4.3 — places a canonical topic into one department's delivery sequence. */
export interface TrainingBinding extends BaseDocument {
  departmentId: string
  topicId: string
  sequence: number
  prerequisiteTopicIds: string[]
  minTenureMonths: number | null
  /** Resolves at evaluation time against the department's onboarding topics, never a frozen list. */
  allCoreTopics: boolean
  /** Advisory display text (§D5) — `requiredTrainerRoleId` is reserved and null on import. */
  suggestedTrainer: string
  requiredTrainerRoleId: string | null
  recurrence: {
    type: TrainingRecurrenceType
    intervalMonths: number | null
    /** The original sheet wording, kept verbatim so operational intent survives. */
    recurrenceNote: string
  }
  sourceNotes: string | null
}

/** §4.4 — `in_progress` is deliberately absent: every imported topic is trainer-delivered, so nothing sits mid-flight. */
export type TrainingAssignmentStatus = 'locked' | 'assigned' | 'completed' | 'cancelled'

export interface TrainingAssessmentResult {
  passed: boolean
  score: number | null
  notes: string | null
  method: 'trainer' | 'quiz'
}

/**
 * One employee's instance of a topic — the compliance record.
 *
 * Documents written before 2026-08-26 carry the superseded flat shape
 * (`trainingId`, no `topicId`) and are never rewritten; branch on `topicId` to
 * tell them apart, the same way appraisals branch on `scoringModelVersion`.
 */
export interface TrainingAssignment extends BaseDocument {
  employeeId: string
  /** Resolved server-side so firestore.rules can serve an employee their own queue; null when they have no login. */
  employeeUid?: string | null
  /** The spec-taxonomy department the sequence came from (`dept-bar`, …); `departmentId` on BaseDocument stays the app's own id. */
  trainingDepartmentId?: string | null
  topicId?: string
  bindingId?: string
  campaignId?: string | null
  status: TrainingAssignmentStatus
  assignedAt?: string | null
  dueAt?: string | null
  completedAt?: string | null
  verifiedByUid?: string | null
  verifiedByName?: string | null
  assessmentResult?: TrainingAssessmentResult | null
  overrideReason?: string | null
  overrideByUid?: string | null

  // ── Legacy (pre-2026-08-26) fields, still present on historical rows ──
  trainingId?: string
  dueDate?: string | null
}

/** Legacy flat catalogue entry. Nothing creates these any more; kept so historical assignments resolve a title and duration. */
export interface Training extends BaseDocument {
  title: string
  type: TrainingType
  description?: string
  mandatory: boolean
  durationHours: number
}
