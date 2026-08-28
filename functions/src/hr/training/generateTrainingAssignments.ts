import { onCall } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
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
  resolveEmployeeUid,
  todayIso,
  type AuthedUser,
} from '../../lib'
import { sendNotificationInternal } from '../../shared/notifications'
import {
  assignmentId,
  dueDateFor,
  evaluateGate,
  resolveTrainingDepartment,
  tenureMonthsSince,
  type TrainingBindingLike,
} from './trainingCatalog'

interface EmployeeLike {
  id: string
  fullName?: string
  departmentId: string
  outletId: string
  joinDate?: string
}

export interface GenerateResult {
  employeeId: string
  trainingDepartmentId: string | null
  assigned: number
  locked: number
  skipped: number
}

/**
 * training-module-spec-v1.0.md §6.1 — assignment generation, run on hire, on
 * department transfer, and on demand.
 *
 * The transfer case is what the canonical `topicId` exists for: an employee
 * who already completed a topic in another department is not re-issued it, so
 * moving between departments is additive rather than destructive.
 */
export async function generateAssignmentsForEmployeeInternal(
  employee: EmployeeLike,
  actor: AuthedUser,
): Promise<GenerateResult> {
  const trainingDepartmentId = resolveTrainingDepartment(employee.departmentId, employee.outletId)
  if (!trainingDepartmentId) {
    // admin_general / sales_marketing / housekeeping have no set in the master
    // sheet — nothing to issue, and inventing one would be worse than nothing.
    return { employeeId: employee.id, trainingDepartmentId: null, assigned: 0, locked: 0, skipped: 0 }
  }

  const [bindingsSnap, existingSnap] = await Promise.all([
    db.collection(COLLECTIONS.TRAINING_BINDINGS).where('departmentId', '==', trainingDepartmentId).get(),
    db.collection(COLLECTIONS.TRAINING_ASSIGNMENTS).where('employeeId', '==', employee.id).get(),
  ])

  const bindings = bindingsSnap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as TrainingBindingLike & { status?: string }) }))
    .filter((binding) => binding.status !== 'archived')
    .sort((a, b) => a.sequence - b.sequence)

  const existingByTopic = new Map(
    existingSnap.docs.map((doc) => [doc.data().topicId as string | undefined, doc.data()]).filter(([topicId]) => topicId) as [
      string,
      FirebaseFirestore.DocumentData,
    ][],
  )
  const completedTopicIds = new Set(
    [...existingByTopic.entries()].filter(([, data]) => data.status === 'completed').map(([topicId]) => topicId),
  )

  const deptOnboardingTopicIds = await onboardingTopicIdsFor(bindings)
  const tenureMonths = tenureMonthsSince(employee.joinDate)
  const employeeUid = await resolveEmployeeUid(employee.id)
  const issuedOn = todayIso()

  const result: GenerateResult = {
    employeeId: employee.id,
    trainingDepartmentId,
    assigned: 0,
    locked: 0,
    skipped: 0,
  }

  const batch = db.batch()
  for (const binding of bindings) {
    if (existingByTopic.has(binding.topicId)) {
      result.skipped += 1
      continue
    }

    const open = evaluateGate({ binding, completedTopicIds, tenureMonths, deptOnboardingTopicIds })
    const status = open ? 'assigned' : 'locked'

    batch.set(db.collection(COLLECTIONS.TRAINING_ASSIGNMENTS).doc(assignmentId(employee.id, binding.topicId)), {
      employeeId: employee.id,
      // Resolved once here so firestore.rules can serve the employee their own
      // queue — Employee.id is not an auth uid (see lib/identity.ts).
      employeeUid,
      departmentId: employee.departmentId,
      trainingDepartmentId,
      outletId: employee.outletId,
      topicId: binding.topicId,
      bindingId: binding.id,
      campaignId: null,
      // Date keys in WITA, never toISOString() — see lib/timestamps.ts.
      assignedAt: open ? issuedOn : null,
      dueAt: open ? dueDateFor(binding.recurrence?.type ?? 'none', issuedOn) : null,
      completedAt: null,
      verifiedByUid: null,
      assessmentResult: null,
      overrideReason: null,
      overrideByUid: null,
      ...newDocumentBaseFields(actor.uid, status),
    })

    if (open) result.assigned += 1
    else result.locked += 1
  }

  if (result.assigned + result.locked > 0) {
    await batch.commit()
  }

  if (result.assigned > 0 && employeeUid) {
    await sendNotificationInternal({
      type: 'alert',
      title: 'Training Assigned',
      message: `${result.assigned} training topic${result.assigned === 1 ? '' : 's'} are ready for you to complete.`,
      module: 'hr',
      priority: 'medium',
      recipientUid: employeeUid,
      senderUid: actor.uid,
      referenceModule: 'hr',
      referenceId: employee.id,
      actionUrl: '/training/me',
    })
  }

  return result
}

/** §4.3 — `allCoreTopics` resolves against the department's onboarding topics as they are now, not a frozen list. */
async function onboardingTopicIdsFor(bindings: { topicId: string }[]): Promise<string[]> {
  const topicIds = [...new Set(bindings.map((binding) => binding.topicId))]
  if (topicIds.length === 0) return []

  // getAll rather than a `where('__name__', 'in', …)` query: no 30-id cap to
  // chunk around, and these are known ids, not a search.
  const snaps = await db.getAll(...topicIds.map((id) => db.collection(COLLECTIONS.TRAINING_TOPICS).doc(id)))
  return snaps.filter((snap) => snap.exists && snap.data()?.phase === 'onboarding').map((snap) => snap.id)
}

/**
 * Manual/backfill route — HR issues the department's sequence to one employee
 * or to everyone in a department. On-hire and on-transfer generation calls
 * generateAssignmentsForEmployeeInternal directly instead.
 */
export const generateTrainingAssignments = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.TRAINING_MANAGE)

    const { employeeId, departmentId } = (request.data ?? {}) as { employeeId?: string; departmentId?: string }
    if (!employeeId && !departmentId) {
      throw new AppError('invalid-argument', 'Pass an employeeId or a departmentId.')
    }

    const employees = employeeId
      ? [await db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId).get()]
      : (
          await db
            .collection(COLLECTIONS.EMPLOYEES)
            .where('departmentId', '==', departmentId)
            .where('status', '==', 'active')
            .get()
        ).docs

    const results: GenerateResult[] = []
    for (const snap of employees) {
      if (!snap.exists) {
        throw new AppError('not-found', 'Employee not found.')
      }
      try {
        results.push(
          await generateAssignmentsForEmployeeInternal({ id: snap.id, ...(snap.data() as Omit<EmployeeLike, 'id'>) }, user),
        )
      } catch (error) {
        // One employee's failure must not abandon the rest of the department —
        // same partial-success shape importEmployees uses.
        logger.error(`Failed to generate training assignments for employee ${snap.id}`, error)
      }
    }

    const assigned = results.reduce((total, result) => total + result.assigned, 0)
    const locked = results.reduce((total, result) => total + result.locked, 0)

    await recordAuditEvent({
      eventType: 'TrainingAssignmentsGenerated',
      category: 'HR',
      module: 'hr',
      resourceType: 'trainingAssignment',
      resourceId: employeeId ?? `department:${departmentId}`,
      action: 'create',
      user,
      newValues: { employees: results.length, assigned, locked },
    })

    return successResponse({ results, assigned, locked }, `${assigned} assigned, ${locked} locked.`)
  } catch (error) {
    return handleError(error)
  }
})
