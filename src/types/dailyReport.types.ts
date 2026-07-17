import type { BaseDocument } from './firestore.types'

export type ChallengeCategory = 'staffing' | 'equipment' | 'supplier' | 'customer' | 'facility' | 'other'
export type ChallengeSeverity = 'low' | 'medium' | 'high'

export interface DailyReportAbsence {
  name: string
  reason: string
}

export interface DailyReportLateArrival {
  name: string
  minutesLate: number
}

export interface DailyReportChallenge {
  description: string
  category: ChallengeCategory
  severity: ChallengeSeverity
  /** Set once a follow-up Task is created for this challenge. */
  taskId?: string | null
}

export interface CarriedForwardReview {
  taskId: string
  status: string
  comment: string
}

/**
 * daily-updates.md §4. Extends the pre-existing `dailyReports` collection
 * placeholder rather than forking a new one (§2's own decision). Open tasks
 * are NOT stored inline — they're real `tasks` docs (`tags: ['dailyUpdate']`,
 * `sourceModule: 'dailyReports'`); `newTaskIds`/`carriedForwardTaskIds` here
 * are just a snapshot of which task docs this submission touched.
 */
export interface DailyReport extends BaseDocument {
  date: string // 'YYYY-MM-DD', server-set — one per outlet+department+date
  submittedBy: string // uid

  staffScheduled: number
  staffPresent: number
  absences: DailyReportAbsence[]
  lateArrivals: DailyReportLateArrival[]

  achievements: string[]
  challenges: DailyReportChallenge[]

  newTaskIds: string[]
  carriedForwardTaskIds: string[]

  /** Overrides BaseDocument's generic status — single-state, not a workflow (no approval required). */
  status: 'submitted'
}
