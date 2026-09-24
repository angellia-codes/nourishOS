import { onCall } from 'firebase-functions/v2/https'
import { Timestamp } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
  type AuthedUser,
} from '../../lib'
import { LEVEL_TO_SCORER_MODEL } from '../positions/tierLadder'
import type { PositionLevel } from '../positions/types'
import type { AppraisalReviewType, ScorerModel, CriterionScoreInput } from './types'
import { scorerRoleFor } from './scorers'
import { notifyAppraisalParties } from './notifyParties'

export interface CreateAppraisalInput {
  employeeId: string
  reviewType: AppraisalReviewType
  periodLabel: string
  periodStart: string
  periodEnd: string
  /** 'YYYY-MM-DD' — the D-day the escalation reminders count down to. Defaults to periodEnd. */
  dueDate?: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export async function resolveActiveUidByRole(role: string): Promise<string | null> {
  const snap = await db.collection(COLLECTIONS.USERS).where('roleId', '==', role).where('status', '==', 'active').limit(1).get()
  return snap.empty ? null : snap.docs[0].id
}

/**
 * An active holder of `role`, preferring the subject's outlet. Returns the
 * outlet the scorer is pinned to — null when nobody holds the role there and
 * the appraisal falls back to any holder (see scorers.ts).
 */
async function resolveScorerByRole(
  role: string,
  outletId: string | null,
): Promise<{ uid: string | null; pinnedOutletId: string | null }> {
  const byRole = db.collection(COLLECTIONS.USERS).where('roleId', '==', role).where('status', '==', 'active')
  if (outletId) {
    const atOutlet = await byRole.where('outletId', '==', outletId).limit(1).get()
    if (!atOutlet.empty) return { uid: atOutlet.docs[0].id, pinnedOutletId: outletId }
  }
  const anywhere = await byRole.limit(1).get()
  return { uid: anywhere.empty ? null : anywhere.docs[0].id, pinnedOutletId: null }
}

/**
 * The mutation itself, split out so scheduleAppraisalCycles (no human caller)
 * can create appraisals the same way createEmployeeInternal-style extractions
 * work elsewhere. positionId is always resolved from the employee record
 * server-side (never client-supplied) — the one source of truth for "what
 * position is this employee in" stays the employee doc.
 */
export async function createAppraisalInternal(
  user: AuthedUser,
  input: Partial<CreateAppraisalInput>,
): Promise<{ appraisalId: string; isStaleTemplate: boolean }> {
  const { employeeId, reviewType, periodLabel, periodStart, periodEnd } = input
  const dueDate = input.dueDate ?? periodEnd
  if (!employeeId || !reviewType || !periodLabel || !periodStart || !periodEnd) {
    throw new AppError(
      'invalid-argument',
      'employeeId, reviewType, periodLabel, periodStart, and periodEnd are required.',
    )
  }
  if (!dueDate || !ISO_DATE.test(dueDate)) {
    throw new AppError('invalid-argument', 'dueDate must be a YYYY-MM-DD date.')
  }

  const employeeSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId).get()
  if (!employeeSnap.exists) {
    throw new AppError('not-found', 'Employee not found.')
  }
  const employee = employeeSnap.data()!
  const positionId = (employee.positionId as string | undefined) ?? (employee.position as string | undefined)
  if (!positionId) {
    throw new AppError('failed-precondition', 'This employee has no position on record.')
  }

  const positionSnap = await db.collection(COLLECTIONS.POSITIONS).doc(positionId).get()
  if (!positionSnap.exists) {
    throw new AppError('failed-precondition', `No position "${positionId}" exists in Positions Master.`)
  }
  const position = positionSnap.data()!
  if (!position.isAppraisable) {
    throw new AppError('failed-precondition', 'This position is not appraisable.')
  }
  const scorerModel = LEVEL_TO_SCORER_MODEL[position.level as PositionLevel] as ScorerModel | 'none'
  if (scorerModel === 'none') {
    throw new AppError('failed-precondition', 'This position (Level 0) is not appraised.')
  }

  // Duplicate guard — §8, composite key.
  const dupSnap = await db
    .collection(COLLECTIONS.APPRAISALS)
    .where('employeeId', '==', employeeId)
    .where('reviewType', '==', reviewType)
    .where('periodLabel', '==', periodLabel)
    .limit(1)
    .get()
  if (!dupSnap.empty) {
    throw new AppError('already-exists', 'An appraisal already exists for this employee, review type, and period.')
  }

  // §6.3 — stale is a warning, not a block: a template that was approved and
  // later flagged stale by a PositionRevised event is still usable, so this
  // is 'in' rather than a single equality on 'approved'. No orderBy paired
  // with it (an 'in' + orderBy on a different field needs a composite index
  // for what's at most a handful of docs per position) — highest version
  // picked in code instead.
  const templateSnap = await db
    .collection(COLLECTIONS.APPRAISAL_TEMPLATES)
    .where('positionId', '==', positionId)
    .where('templateStatus', 'in', ['approved', 'stale'])
    .get()
  if (templateSnap.empty) {
    throw new AppError('failed-precondition', `No approved appraisal template for position "${positionId}".`)
  }
  const template = templateSnap.docs.reduce((latest, doc) =>
    (doc.data().version as number) > (latest.data().version as number) ? doc : latest,
  )
  const isStaleTemplate = template.data().templateStatus === 'stale'
  const criteria = template.data().criteria as { criterionId: string }[]

  // Role-based scorer (scorers.ts) — no users/{uid}.employeeId link needed.
  const employeeOutletId = (employee.outletId as string | undefined) ?? null
  let primaryScorerRoleId: string
  let primaryScorerRole: 'departmentHead' | 'generalManager'
  let secondaryScorerUid: string | null = null
  let secondaryScorerRole: 'hrManager' | null = null

  if (scorerModel === 'dualScorer') {
    const scorerPositionId = position.appraisalScorerPositionId as string | null
    if (!scorerPositionId) {
      throw new AppError('failed-precondition', 'This position has no appraisal scorer assigned (scorerUnassigned).')
    }
    primaryScorerRoleId = scorerRoleFor(scorerPositionId)
    primaryScorerRole = 'departmentHead'
    secondaryScorerUid = await resolveActiveUidByRole('hrManager')
    secondaryScorerRole = 'hrManager'
  } else {
    primaryScorerRoleId = 'generalManager'
    primaryScorerRole = 'generalManager'
  }
  const scorer = await resolveScorerByRole(
    primaryScorerRoleId,
    primaryScorerRoleId === 'generalManager' ? null : employeeOutletId,
  )
  // Created regardless: a missing scorer is flagged on the dashboard for HR to
  // fix (give someone the role), not a reason to skip the cycle.
  const scorerMissing = scorer.uid === null

  const criterionScores: CriterionScoreInput[] = criteria.map((c) => ({ criterionId: c.criterionId, score: 0 }))

  const appraisalRef = db.collection(COLLECTIONS.APPRAISALS).doc()
  await appraisalRef.set({
    employeeId,
    // Denormalized for the dashboard — a scorer outside HR can't list employees.
    employeeName: (employee.fullName as string | undefined) ?? null,
    positionId,
    employeeDepartmentId: (employee.departmentId as string | undefined) ?? null,
    templateId: template.id,
    templateVersion: template.data().version,
    scoringModelVersion: 2,
    reviewType,
    periodLabel,
    periodStart: Timestamp.fromDate(new Date(periodStart)),
    periodEnd: Timestamp.fromDate(new Date(periodEnd)),
    scorerModel,
    approvalModel: scorerModel === 'dualScorer' ? 'gm' : 'none',
    // A hint only — anyone holding primaryScorerRoleId (at primaryScorerOutletId,
    // when set) may score; submitPrimaryScores overwrites it with whoever does.
    primaryScorerUid: scorer.uid,
    primaryScorerRole,
    primaryScorerRoleId,
    primaryScorerOutletId: scorer.pinnedOutletId,
    scorerMissing,
    dueDate,
    remindersSent: [],
    secondaryScorerUid,
    secondaryScorerRole,
    criterionScores: criterionScores.map((c) => ({
      criterionId: c.criterionId,
      primaryScore: null,
      secondaryScore: null,
      weightedScore: null,
      primaryNote: null,
      secondaryNote: null,
    })),
    primarySubmittedAt: null,
    primarySubmittedBy: null,
    secondarySubmittedAt: null,
    secondarySubmittedBy: null,
    primaryAverage: null,
    secondaryAverage: null,
    finalScore: null,
    ratingBand: null,
    overallComment: null,
    employeeSelfComment: null,
    acknowledgement: null,
    approvalRequestId: null,
    consequenceTaskId: null,
    aiInsights: null,
    ...newDocumentBaseFields(user.uid, 'draft'),
  })

  await recordAuditEvent({
    eventType: 'AppraisalCreated',
    category: 'HR',
    module: 'hr',
    resourceType: 'appraisal',
    resourceId: appraisalRef.id,
    action: 'create',
    user,
    newValues: { employeeId, positionId, reviewType, periodLabel, scorerModel, dueDate, primaryScorerRoleId },
  })

  const employeeName = (employee.fullName as string | undefined) ?? employeeId
  await notifyAppraisalParties({
    appraisalId: appraisalRef.id,
    scorerRoleId: primaryScorerRoleId,
    scorerOutletId: scorer.pinnedOutletId,
    title: 'Appraisal due',
    message:
      `${reviewType[0].toUpperCase()}${reviewType.slice(1)} appraisal for ${employeeName} is due ${dueDate}.` +
      (scorerMissing ? ` No active user holds the scoring role (${primaryScorerRoleId}) — HR, please assign it.` : ''),
    priority: scorerMissing ? 'high' : 'medium',
  })

  return { appraisalId: appraisalRef.id, isStaleTemplate }
}

/** Manual creation (ad-hoc, outside the scheduled cycles) — HR Manager only, same actor who scores the HR 40% and manages templates. */
export const createAppraisal = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.APPRAISALS_SCORE_SECONDARY)

    const result = await createAppraisalInternal(user, (request.data ?? {}) as Partial<CreateAppraisalInput>)
    return successResponse(result, 'Appraisal draft created.')
  } catch (error) {
    handleError(error)
  }
})
