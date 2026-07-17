import { orderBy, where } from 'firebase/firestore'
import { callFunction } from '@/services/api'
import { subscribeToCollection } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Priority } from '@/constants/statuses'
import type { DailyReport, DailyReportAbsence, DailyReportChallenge, DailyReportLateArrival, Task } from '@/types'
import type { Unsubscribe } from 'firebase/firestore'

export interface CarriedForwardReviewInput {
  taskId: string
  status: string
  comment?: string
}

export interface NewTaskInput {
  title: string
  description?: string
  assignedTo: string
  priority: Priority
  dueDate?: string
}

export interface ChallengeInput extends Omit<DailyReportChallenge, 'taskId'> {
  /** Not stored as-is — drives whether the backend creates a follow-up Task. */
  requiresFollowUp?: boolean
}

export interface SubmitDailyReportInput {
  staffScheduled: number
  staffPresent: number
  absences?: DailyReportAbsence[]
  lateArrivals?: DailyReportLateArrival[]
  achievements?: string[]
  challenges?: ChallengeInput[]
  newTasks?: NewTaskInput[]
  carriedForwardReviews?: CarriedForwardReviewInput[]
}

export function submitDailyReport(input: SubmitDailyReportInput): Promise<{ reportId: string }> {
  return callFunction('submitDailyReport', input)
}

export function subscribeToDailyReports(onChange: (reports: DailyReport[]) => void): Unsubscribe {
  return subscribeToCollection<DailyReport>(
    COLLECTIONS.DAILY_REPORTS,
    [where('isArchived', '==', false), orderBy('createdAt', 'desc')],
    onChange,
  )
}

const CLOSED_TASK_STATUSES = new Set(['completed', 'verified', 'closed', 'cancelled', 'archived'])

/** Open dailyUpdate-tagged tasks assigned to `uid` — Section B's carried-forward review list. Closed-status filtering happens client-side over one subscription, matching the employees/checkpoints convention. */
export function subscribeToMyCarriedForwardTasks(uid: string, onChange: (tasks: Task[]) => void): Unsubscribe {
  return subscribeToCollection<Task>(
    COLLECTIONS.TASKS,
    [where('tags', 'array-contains', 'dailyUpdate'), where('assignedTo', 'array-contains', uid)],
    (tasks) => onChange(tasks.filter((task) => !CLOSED_TASK_STATUSES.has(task.taskStatus))),
  )
}
