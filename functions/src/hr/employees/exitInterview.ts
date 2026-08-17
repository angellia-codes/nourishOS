import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  PERMISSIONS,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
} from '../../lib'
import { completeTaskInternal } from '../../shared/tasks'
import { requireIsoDate } from './helpers'
import { requireText, requireOneOf, CANDIDATE_SOURCES } from '../recruitment/helpers'

/** exit-interview.md §3. */
const JOIN_REASONS = [
  'establishedCompany',
  'companyReputation',
  'friendReferral',
  'careerOpportunity',
  'salaryIncrease',
  'trainingProgram',
  'other',
] as const

const EXIT_REASONS = [
  'personal',
  'continuingStudy',
  'health',
  'relocation',
  'transportationTooFar',
  'resignedWithoutNotice',
  'anotherJobSameIndustry',
  'anotherJobDifferentIndustry',
  'notReturningFromLeave',
  'pension',
  'contractExpiration',
  'other',
] as const

const RESIGNATION_CATEGORIES = ['voluntary', 'involuntary'] as const
const INTENDED_TENURES = ['0-3m', '4-6m', '6-9m', '12m', '2y', '>2y'] as const
const RATING_SECTIONS = ['company', 'manager', 'culture'] as const
const SURVEY_VERSION = 'F009-v1'

interface RatingInput {
  section: (typeof RATING_SECTIONS)[number]
  itemKey: string
  itemLabel: string
  score: 1 | 2 | 3 | 4
}

function requireRatings(value: unknown): RatingInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError('invalid-argument', 'ratings must be a non-empty array.')
  }
  return value.map((raw, index) => {
    const row = raw as Partial<RatingInput>
    if (!RATING_SECTIONS.includes(row.section as (typeof RATING_SECTIONS)[number])) {
      throw new AppError('invalid-argument', `ratings[${index}].section is invalid.`)
    }
    if (!row.itemKey?.trim() || !row.itemLabel?.trim()) {
      throw new AppError('invalid-argument', `ratings[${index}] is missing itemKey/itemLabel.`)
    }
    if (![1, 2, 3, 4].includes(row.score as number)) {
      throw new AppError('invalid-argument', `ratings[${index}].score must be 1-4.`)
    }
    return { section: row.section!, itemKey: row.itemKey.trim(), itemLabel: row.itemLabel.trim(), score: row.score! }
  })
}

/**
 * exit-interview.md — the F009 structured survey behind the "Exit Interview"
 * offboarding task. Gated by exitInterviews.view, the same string that gates
 * reading the collection (§4/§5 — deliberate, not an oversight): a harder
 * confidentiality wall than the rest of the offboarding checklist, since
 * Section I asks the employee to rate their own manager.
 *
 * No separate update — immutable once both acknowledgments are recorded
 * (§5's "no separate updateExitInterview" note), so both must already be
 * true at submit time; there is no draft state to come back to.
 */
export const submitExitInterview = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EXIT_INTERVIEWS_VIEW)

    const data = (request.data ?? {}) as Record<string, unknown>

    const employeeId = requireText(data.employeeId, 'employeeId', 200)
    const offboardingChecklistId = requireText(data.offboardingChecklistId, 'offboardingChecklistId', 200)
    const interviewDate = requireIsoDate(data.interviewDate, 'interviewDate')
    const recruitmentSource = requireOneOf(data.recruitmentSource, CANDIDATE_SOURCES, 'recruitmentSource')
    const joinReason = requireOneOf(data.joinReason, JOIN_REASONS, 'joinReason')
    const exitReason = requireOneOf(data.exitReason, EXIT_REASONS, 'exitReason')
    const resignationCategory = requireOneOf(data.resignationCategory, RESIGNATION_CATEGORIES, 'resignationCategory')
    const intendedTenure = requireOneOf(data.intendedTenure, INTENDED_TENURES, 'intendedTenure')
    const ratings = requireRatings(data.ratings)

    const expectationsWereClear = data.expectationsWereClear === true
    const trainingMetExpectations = data.trainingMetExpectations === true
    const wouldReturnToWork = data.wouldReturnToWork === true

    if (!expectationsWereClear && !(data.expectationsExplanation as string | undefined)?.trim()) {
      throw new AppError('invalid-argument', 'expectationsExplanation is required when expectationsWereClear is false.')
    }
    if (!trainingMetExpectations && !(data.trainingExplanation as string | undefined)?.trim()) {
      throw new AppError('invalid-argument', 'trainingExplanation is required when trainingMetExpectations is false.')
    }
    if (!wouldReturnToWork && !(data.wouldReturnExplanation as string | undefined)?.trim()) {
      throw new AppError('invalid-argument', 'wouldReturnExplanation is required when wouldReturnToWork is false.')
    }
    if (data.employeeAcknowledged !== true || data.interviewerAcknowledged !== true) {
      throw new AppError('invalid-argument', 'Both employeeAcknowledged and interviewerAcknowledged are required to submit.')
    }

    const checklistRef = db.collection(COLLECTIONS.OFFBOARDING_CHECKLISTS).doc(offboardingChecklistId)
    const checklistSnap = await checklistRef.get()
    if (!checklistSnap.exists) {
      throw new AppError('not-found', 'That offboarding checklist no longer exists.')
    }
    const checklist = checklistSnap.data()!
    if (checklist.employeeId !== employeeId) {
      throw new AppError('invalid-argument', 'That checklist does not belong to this employee.')
    }
    if (checklist.exitInterviewId) {
      throw new AppError('failed-precondition', 'An exit interview has already been recorded for this employee.')
    }

    const employeeSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId).get()
    if (!employeeSnap.exists) {
      throw new AppError('not-found', 'Employee not found.')
    }
    const employee = employeeSnap.data()!

    const ref = db.collection(COLLECTIONS.EXIT_INTERVIEWS).doc()
    const now = new Date().toISOString()

    await ref.set({
      employeeId,
      offboardingChecklistId,
      interviewerId: user.uid,
      interviewDate,
      surveyVersion: SURVEY_VERSION,
      employeeManagerId: (employee.managerId as string | undefined) ?? null,
      departmentId: employee.departmentId ?? null,
      outletId: employee.outletId ?? null,
      recruitmentSource,
      recruitmentSourceOther: (data.recruitmentSourceOther as string | undefined)?.trim() || null,
      joinReason,
      joinReasonOther: (data.joinReasonOther as string | undefined)?.trim() || null,
      exitReason,
      exitReasonOther: (data.exitReasonOther as string | undefined)?.trim() || null,
      resignationCategory,
      expectationsWereClear,
      expectationsExplanation: (data.expectationsExplanation as string | undefined)?.trim() || null,
      trainingMetExpectations,
      trainingExplanation: (data.trainingExplanation as string | undefined)?.trim() || null,
      intendedTenure,
      ratings,
      wouldReturnToWork,
      wouldReturnExplanation: (data.wouldReturnExplanation as string | undefined)?.trim() || null,
      employeeAcknowledged: true,
      employeeAcknowledgedAt: now,
      interviewerAcknowledged: true,
      interviewerAcknowledgedAt: now,
      ...newDocumentBaseFields(user.uid, 'completed'),
    })

    await checklistRef.update({ exitInterviewId: ref.id })

    const taskSnap = await db
      .collection(COLLECTIONS.TASKS)
      .where('referenceId', '==', offboardingChecklistId)
      .where('tags', 'array-contains', 'offboarding-interview')
      .limit(1)
      .get()
    if (!taskSnap.empty) {
      await completeTaskInternal({ taskId: taskSnap.docs[0].id, actorUser: user, comment: 'Exit interview submitted.' })
    }

    await recordAuditEvent({
      eventType: 'ExitInterviewSubmitted',
      category: 'HR',
      module: 'hr',
      resourceType: 'exitInterview',
      resourceId: ref.id,
      action: 'create',
      user,
      severity: 'high',
      newValues: { employeeId, offboardingChecklistId, resignationCategory, exitReason },
    })

    return successResponse({ exitInterviewId: ref.id }, 'Exit interview recorded.')
  } catch (error) {
    return handleError(error)
  }
})

const AGGREGATE_ROLES = ['hrManager', 'generalManager', 'director', 'superAdmin']

interface AggregateResult {
  totalInterviews: number
  turnoverReasonBreakdown: Record<string, number>
  resignationCategory: { voluntary: number; involuntary: number; voluntaryRate: number }
  companySatisfactionTrend: Array<{ month: string; average: number; count: number }>
  /** §6's N>=3 safeguard — managers with fewer than 3 linked interviews are omitted entirely, never sent to the client even in aggregate. */
  managerRatingAverages: Record<string, { average: number; interviewCount: number }>
  recruitmentSourceEffectiveness: Record<string, Record<string, number>>
}

/**
 * exit-interview.md §6 — aggregate-only reporting. Raw exitInterviews rows
 * stay hrManager/superAdmin-only in firestore.rules; GM/Director get rollups
 * through this callable instead of a direct collection read, and the
 * per-manager minimum-N safeguard is enforced here so a below-threshold
 * manager's average never reaches the client at all, aggregate or not.
 */
export const getExitInterviewInsights = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    if (user.roleId !== 'superAdmin' && !AGGREGATE_ROLES.includes(user.roleId)) {
      throw new AppError('permission-denied', 'Exit interview insights are limited to HR and above.')
    }

    const snap = await db.collection(COLLECTIONS.EXIT_INTERVIEWS).where('isArchived', '==', false).get()
    const interviews = snap.docs.map((doc) => doc.data())

    const turnoverReasonBreakdown: Record<string, number> = {}
    const resignationCategory = { voluntary: 0, involuntary: 0, voluntaryRate: 0 }
    const monthTotals = new Map<string, { sum: number; count: number }>()
    const managerTotals = new Map<string, { sum: number; count: number; interviewIds: Set<string> }>()
    const sourceTenureTotals: Record<string, Record<string, number>> = {}

    for (const interview of interviews) {
      const exitReason = interview.exitReason as string
      turnoverReasonBreakdown[exitReason] = (turnoverReasonBreakdown[exitReason] ?? 0) + 1

      const category = interview.resignationCategory as 'voluntary' | 'involuntary'
      resignationCategory[category] += 1

      const month = (interview.interviewDate as string).slice(0, 7)
      const ratings = (interview.ratings ?? []) as AggregateRatingRow[]

      const companyScores = ratings.filter((r) => r.section === 'company')
      if (companyScores.length > 0) {
        const bucket = monthTotals.get(month) ?? { sum: 0, count: 0 }
        bucket.sum += companyScores.reduce((total, r) => total + r.score, 0)
        bucket.count += companyScores.length
        monthTotals.set(month, bucket)
      }

      const managerId = interview.employeeManagerId as string | null
      const managerScores = ratings.filter((r) => r.section === 'manager')
      if (managerId && managerScores.length > 0) {
        const bucket = managerTotals.get(managerId) ?? { sum: 0, count: 0, interviewIds: new Set<string>() }
        bucket.sum += managerScores.reduce((total, r) => total + r.score, 0)
        bucket.count += managerScores.length
        bucket.interviewIds.add(interview.employeeId as string)
        managerTotals.set(managerId, bucket)
      }

      const source = interview.recruitmentSource as string
      const tenure = interview.intendedTenure as string
      sourceTenureTotals[source] = sourceTenureTotals[source] ?? {}
      sourceTenureTotals[source][tenure] = (sourceTenureTotals[source][tenure] ?? 0) + 1
    }

    const totalCategorized = resignationCategory.voluntary + resignationCategory.involuntary
    resignationCategory.voluntaryRate = totalCategorized > 0 ? resignationCategory.voluntary / totalCategorized : 0

    const companySatisfactionTrend = Array.from(monthTotals.entries())
      .map(([month, { sum, count }]) => ({ month, average: sum / count, count }))
      .sort((a, b) => a.month.localeCompare(b.month))

    const managerRatingAverages: AggregateResult['managerRatingAverages'] = {}
    for (const [managerId, { sum, count, interviewIds }] of managerTotals) {
      if (interviewIds.size < 3) continue
      managerRatingAverages[managerId] = { average: sum / count, interviewCount: interviewIds.size }
    }

    const result: AggregateResult = {
      totalInterviews: interviews.length,
      turnoverReasonBreakdown,
      resignationCategory,
      companySatisfactionTrend,
      managerRatingAverages,
      recruitmentSourceEffectiveness: sourceTenureTotals,
    }

    return successResponse(result, 'Exit interview insights loaded.')
  } catch (error) {
    return handleError(error)
  }
})

interface AggregateRatingRow {
  section: 'company' | 'manager' | 'culture'
  score: number
}
