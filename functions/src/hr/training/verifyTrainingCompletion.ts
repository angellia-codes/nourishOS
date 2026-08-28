import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
  todayIso,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
  type AuthedUser,
} from '../../lib'
import { sendNotificationInternal } from '../../shared/notifications'
import { dueDateFor, evaluateGate, tenureMonthsSince, type TrainingBindingLike } from './trainingCatalog'

/** Manager-tier verification is scoped to the caller's own outlet + department (§5); these two see everything. */
const UNSCOPED_ROLES = ['hrManager', 'superAdmin']

interface AssessmentInput {
  passed: boolean
  score?: number | null
  notes?: string | null
}

/**
 * training-module-spec-v1.0.md §6.2 — trainer-mode sign-off, and the only way
 * an assignment reaches `completed`.
 *
 * D5's accepted risk (O7) is that a manager can sign off training they did not
 * witness; the mitigation is that `verifiedByUid` and the assessment outcome
 * are recorded and audited, not that it is prevented.
 */
export const verifyTrainingCompletion = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.TRAINING_VERIFY)

    const { assignmentId, assessment } = (request.data ?? {}) as {
      assignmentId?: string
      assessment?: AssessmentInput
    }
    const id = typeof assignmentId === 'string' ? assignmentId.trim() : ''
    if (!id || typeof assessment?.passed !== 'boolean') {
      throw new AppError('invalid-argument', 'assignmentId and assessment.passed are required.')
    }

    const score = assessment.score ?? null
    if (score !== null && (typeof score !== 'number' || !Number.isFinite(score) || score < 1 || score > 10)) {
      throw new AppError('invalid-argument', 'score must be between 1 and 10, or omitted.')
    }

    const ref = db.collection(COLLECTIONS.TRAINING_ASSIGNMENTS).doc(id)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That training assignment no longer exists.')
    }
    const assignment = snap.data()!

    if (!assignment.topicId) {
      throw new AppError('failed-precondition', 'That is a legacy training assignment and cannot be verified here.')
    }
    if (assignment.status === 'completed') {
      throw new AppError('failed-precondition', 'That training is already signed off.')
    }
    if (assignment.status !== 'assigned') {
      throw new AppError(
        'failed-precondition',
        assignment.status === 'locked'
          ? 'That topic is still locked behind its prerequisites. Override it first if it really was delivered.'
          : `That assignment is ${assignment.status as string}.`,
      )
    }
    assertInScope(user, assignment)

    await ref.update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      verifiedByUid: user.uid,
      verifiedByName: user.displayName || null,
      assessmentResult: {
        passed: assessment.passed,
        score,
        notes: typeof assessment.notes === 'string' && assessment.notes.trim() ? assessment.notes.trim() : null,
        // §6.3's `quiz` method waits on digital content — all 197 topics import as trainer mode (D1).
        method: 'trainer',
      },
      ...updatedFields(user.uid),
    })

    const unlocked = await unlockDependentAssignments(assignment.employeeId as string, user)

    await recordAuditEvent({
      eventType: 'TrainingVerified',
      category: 'HR',
      module: 'hr',
      resourceType: 'trainingAssignment',
      resourceId: id,
      action: 'update',
      user,
      newValues: {
        employeeId: assignment.employeeId,
        topicId: assignment.topicId,
        passed: assessment.passed,
        score,
        unlocked,
      },
    })

    if (assignment.employeeUid) {
      await sendNotificationInternal({
        type: 'alert',
        title: assessment.passed ? 'Training Completed' : 'Training Assessed',
        message: assessment.passed
          ? `Your training was signed off by ${user.displayName || 'your manager'}.`
          : `Your training was assessed as not yet passed by ${user.displayName || 'your manager'}.`,
        module: 'hr',
        priority: 'medium',
        recipientUid: assignment.employeeUid as string,
        senderUid: user.uid,
        referenceModule: 'hr',
        referenceId: id,
        actionUrl: '/training/me',
      })
    }

    return successResponse({ assignmentId: id, unlocked }, 'Training signed off.')
  } catch (error) {
    return handleError(error)
  }
})

function assertInScope(user: AuthedUser, assignment: FirebaseFirestore.DocumentData): void {
  if (UNSCOPED_ROLES.includes(user.roleId)) return
  if (assignment.outletId === user.outletId && assignment.departmentId === user.departmentId) return
  throw new AppError('permission-denied', 'You can only sign off training for your own department and outlet.')
}

/**
 * §6.2 step 4 — completing a topic can open whatever was gated behind it. The
 * whole gate is re-evaluated per locked assignment rather than tracking
 * reverse dependencies, because `allCoreTopics` and the tenure gate have no
 * dependency edge to follow.
 */
async function unlockDependentAssignments(employeeId: string, actor: AuthedUser): Promise<number> {
  const [assignmentsSnap, employeeSnap] = await Promise.all([
    db.collection(COLLECTIONS.TRAINING_ASSIGNMENTS).where('employeeId', '==', employeeId).get(),
    db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId).get(),
  ])

  const assignments = assignmentsSnap.docs.filter((doc) => doc.data().topicId)
  const completedTopicIds = new Set(
    assignments.filter((doc) => doc.data().status === 'completed').map((doc) => doc.data().topicId as string),
  )
  const locked = assignments.filter((doc) => doc.data().status === 'locked')
  if (locked.length === 0) return 0

  const bindingSnaps = await db.getAll(
    ...locked.map((doc) => db.collection(COLLECTIONS.TRAINING_BINDINGS).doc(doc.data().bindingId as string)),
  )
  const bindingById = new Map(bindingSnaps.filter((snap) => snap.exists).map((snap) => [snap.id, snap.data()!]))

  const trainingDepartmentId = locked[0].data().trainingDepartmentId as string | undefined
  const deptOnboardingTopicIds = trainingDepartmentId ? await onboardingTopicIds(trainingDepartmentId) : []
  const tenureMonths = tenureMonthsSince(employeeSnap.data()?.joinDate as string | undefined)
  const issuedOn = todayIso()

  const batch = db.batch()
  let unlocked = 0
  for (const doc of locked) {
    const binding = bindingById.get(doc.data().bindingId as string) as TrainingBindingLike | undefined
    if (!binding) continue

    if (!evaluateGate({ binding, completedTopicIds, tenureMonths, deptOnboardingTopicIds })) continue

    batch.update(doc.ref, {
      status: 'assigned',
      assignedAt: issuedOn,
      dueAt: dueDateFor(binding.recurrence?.type ?? 'none', issuedOn),
      ...updatedFields(actor.uid),
    })
    unlocked += 1
  }

  if (unlocked > 0) await batch.commit()
  return unlocked
}

async function onboardingTopicIds(trainingDepartmentId: string): Promise<string[]> {
  const bindingsSnap = await db
    .collection(COLLECTIONS.TRAINING_BINDINGS)
    .where('departmentId', '==', trainingDepartmentId)
    .get()
  const topicIds = [...new Set(bindingsSnap.docs.map((doc) => doc.data().topicId as string))]
  if (topicIds.length === 0) return []

  const snaps = await db.getAll(...topicIds.map((id) => db.collection(COLLECTIONS.TRAINING_TOPICS).doc(id)))
  return snaps.filter((snap) => snap.exists && snap.data()?.phase === 'onboarding').map((snap) => snap.id)
}
