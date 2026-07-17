import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { notifyUsersByRole } from '../../shared/notifications'
import { createTaskInternal } from '../../shared/tasks'
import { CLOSED_TASK_STATUSES, DAILY_UPDATE_TAG, todayIso } from './helpers'

interface AbsenceInput {
  name: string
  reason: string
}
interface LateArrivalInput {
  name: string
  minutesLate: number
}
interface ChallengeInput {
  description: string
  category: 'staffing' | 'equipment' | 'supplier' | 'customer' | 'facility' | 'other'
  severity: 'low' | 'medium' | 'high'
  requiresFollowUp?: boolean
}
interface NewTaskInput {
  title: string
  description?: string
  assignedTo: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  dueDate?: string
}
interface CarriedForwardReviewInput {
  taskId: string
  status: string
  comment?: string
}

interface SubmitDailyReportInput {
  staffScheduled: number
  staffPresent: number
  absences?: AbsenceInput[]
  lateArrivals?: LateArrivalInput[]
  achievements?: string[]
  challenges?: ChallengeInput[]
  newTasks?: NewTaskInput[]
  carriedForwardReviews?: CarriedForwardReviewInput[]
}

/**
 * daily-updates.md §6, submitDailyReport row. Blocks submission until every
 * carried-forward dailyUpdate task assigned to this user has a status
 * update dated today (E10-US01 / AC-1). One report per outlet+department+date.
 */
export const submitDailyReport = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.DAILY_UPDATES_SUBMIT)
    if (!user.outletId || !user.departmentId) {
      throw new AppError('failed-precondition', 'Your account has no outlet/department assigned.')
    }

    const input = (request.data ?? {}) as Partial<SubmitDailyReportInput>
    if (typeof input.staffScheduled !== 'number' || typeof input.staffPresent !== 'number') {
      throw new AppError('invalid-argument', 'staffScheduled and staffPresent are required.')
    }
    const absences = input.absences ?? []
    if (input.staffPresent < input.staffScheduled && absences.length === 0) {
      throw new AppError('invalid-argument', 'absences are required when staffPresent is less than staffScheduled.')
    }

    const today = todayIso()

    const existingSnap = await db
      .collection(COLLECTIONS.DAILY_REPORTS)
      .where('outletId', '==', user.outletId)
      .where('departmentId', '==', user.departmentId)
      .where('date', '==', today)
      .limit(1)
      .get()
    if (!existingSnap.empty) {
      throw new AppError('already-exists', 'A daily update has already been submitted for this outlet/department today.')
    }

    const openTasksSnap = await db
      .collection(COLLECTIONS.TASKS)
      .where('tags', 'array-contains', DAILY_UPDATE_TAG)
      .where('assignedTo', 'array-contains', user.uid)
      .get()
    const openTasks = openTasksSnap.docs.filter((doc) => !CLOSED_TASK_STATUSES.includes(doc.data().taskStatus))

    const reviews = input.carriedForwardReviews ?? []
    const reviewedIds = new Set(reviews.map((r) => r.taskId))
    const missing = openTasks.filter((doc) => !reviewedIds.has(doc.id))
    if (missing.length > 0) {
      throw new AppError(
        'failed-precondition',
        `Every carried-forward task must be reviewed before submitting. Missing: ${missing.map((d) => d.id).join(', ')}.`,
      )
    }
    for (const review of reviews) {
      const task = openTasks.find((doc) => doc.id === review.taskId)?.data()
      if (task && task.taskStatus === review.status && !review.comment?.trim()) {
        throw new AppError('invalid-argument', `A comment is required for "${task.title}" since its status is unchanged.`)
      }
    }

    // Apply the reviews — same document per task, no duplicate rows.
    await Promise.all(
      reviews.map((review) =>
        db
          .collection(COLLECTIONS.TASKS)
          .doc(review.taskId)
          .update({ taskStatus: review.status, ...updatedFields(user.uid) }),
      ),
    )

    const reportRef = db.collection(COLLECTIONS.DAILY_REPORTS).doc()

    const newTaskIds = await Promise.all(
      (input.newTasks ?? []).map((task) =>
        createTaskInternal({
          title: task.title,
          description: task.description,
          taskType: 'custom',
          sourceModule: 'dailyReports',
          referenceId: reportRef.id,
          assignedTo: task.assignedTo,
          assignedBy: user.uid,
          priority: task.priority,
          dueDate: task.dueDate ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        }),
      ),
    )

    const challenges = await Promise.all(
      (input.challenges ?? []).map(async (challenge) => {
        if (!challenge.requiresFollowUp) return { ...challenge, taskId: null }
        const taskId = await createTaskInternal({
          title: `Follow up: ${challenge.description.slice(0, 80)}`,
          taskType: 'followUp',
          sourceModule: 'dailyReports',
          referenceId: reportRef.id,
          assignedTo: user.uid,
          assignedBy: user.uid,
          priority: challenge.severity === 'high' ? 'high' : 'medium',
        })
        return { ...challenge, taskId }
      }),
    )

    await reportRef.set({
      date: today,
      submittedBy: user.uid,
      staffScheduled: input.staffScheduled,
      staffPresent: input.staffPresent,
      absences,
      lateArrivals: input.lateArrivals ?? [],
      achievements: input.achievements ?? [],
      challenges,
      newTaskIds,
      carriedForwardTaskIds: openTasks.map((doc) => doc.id),
      outletId: user.outletId,
      departmentId: user.departmentId,
      ...newDocumentBaseFields(user.uid, 'submitted'),
    })

    await recordAuditEvent({
      eventType: 'DailyReportSubmitted',
      category: 'Operations',
      module: 'operations',
      resourceType: 'dailyReport',
      resourceId: reportRef.id,
      action: 'create',
      user,
      newValues: { date: today, outletId: user.outletId, departmentId: user.departmentId },
      metadata: { carriedForwardReviews: reviews },
    })

    await notifyUsersByRole({
      role: 'hrManager',
      module: 'operations',
      title: 'Daily Update Submitted',
      message: `${user.displayName} submitted the daily update for ${today}.`,
      referenceId: reportRef.id,
      priority: 'informational',
    })

    return successResponse({ reportId: reportRef.id }, 'Daily update submitted.')
  } catch (error) {
    handleError(error)
  }
})
