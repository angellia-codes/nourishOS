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
  resolveEmployeeUid,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
  type AuthedUser,
} from '../../lib'
import { LEVEL_TO_SCORER_MODEL } from '../positions/tierLadder'
import type { PositionLevel } from '../positions/types'
import type { AppraisalReviewType, ScorerModel, CriterionScoreInput } from './types'

export interface CreateAppraisalInput {
  employeeId: string
  reviewType: AppraisalReviewType
  periodLabel: string
  periodStart: string
  periodEnd: string
}

export async function resolveActiveUidByRole(role: string): Promise<string | null> {
  const snap = await db.collection(COLLECTIONS.USERS).where('roleId', '==', role).where('status', '==', 'active').limit(1).get()
  return snap.empty ? null : snap.docs[0].id
}

/** The active employee currently occupying `scorerPositionId`, resolved by either the legacy `position` field or the migrated `positionId`. */
async function resolveOccupantUid(scorerPositionId: string): Promise<string | null> {
  const [byLegacy, byMigrated] = await Promise.all([
    db.collection(COLLECTIONS.EMPLOYEES).where('position', '==', scorerPositionId).where('status', '==', 'active').limit(1).get(),
    db.collection(COLLECTIONS.EMPLOYEES).where('positionId', '==', scorerPositionId).where('status', '==', 'active').limit(1).get(),
  ])
  const employeeDoc = (!byLegacy.empty ? byLegacy.docs[0] : null) ?? (!byMigrated.empty ? byMigrated.docs[0] : null)
  if (!employeeDoc) return null
  return resolveEmployeeUid(employeeDoc.id)
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
  if (!employeeId || !reviewType || !periodLabel || !periodStart || !periodEnd) {
    throw new AppError(
      'invalid-argument',
      'employeeId, reviewType, periodLabel, periodStart, and periodEnd are required.',
    )
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

  let primaryScorerUid: string | null
  let primaryScorerRole: 'departmentHead' | 'generalManager'
  let secondaryScorerUid: string | null = null
  let secondaryScorerRole: 'hrManager' | null = null

  if (scorerModel === 'dualScorer') {
    const scorerPositionId = position.appraisalScorerPositionId as string | null
    if (!scorerPositionId) {
      throw new AppError('failed-precondition', 'This position has no appraisal scorer assigned (scorerUnassigned).')
    }
    primaryScorerUid = await resolveOccupantUid(scorerPositionId)
    if (!primaryScorerUid) {
      throw new AppError('failed-precondition', 'The scorer seat is vacant, or has no NourishOS account linked.')
    }
    primaryScorerRole = 'departmentHead'
    secondaryScorerUid = await resolveActiveUidByRole('hrManager')
    secondaryScorerRole = 'hrManager'
  } else {
    primaryScorerUid = await resolveActiveUidByRole('generalManager')
    if (!primaryScorerUid) {
      throw new AppError('failed-precondition', 'No active General Manager account found.')
    }
    primaryScorerRole = 'generalManager'
  }

  const criterionScores: CriterionScoreInput[] = criteria.map((c) => ({ criterionId: c.criterionId, score: 0 }))

  const appraisalRef = db.collection(COLLECTIONS.APPRAISALS).doc()
  await appraisalRef.set({
    employeeId,
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
    primaryScorerUid,
    primaryScorerRole,
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
    newValues: { employeeId, positionId, reviewType, periodLabel, scorerModel },
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
