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
  updatedFields,
  todayIso,
  AppError,
  handleError,
  successResponse,
} from '../../lib'
import { createTaskInternal } from '../../shared/tasks'
import { notifyUsersByRole } from '../../shared/notifications'
import { DEPARTMENT_ROLES } from '../../lib/organization'
import { OFFBOARDING_DOCUMENT_ITEMS } from './offboardingItems'

/**
 * Offboarding — employee-onboarding-exit-checklist.md §5, mirrors
 * onboarding.ts's architecture: an embedded documentChecklist array for the
 * 3 genuinely-a-document OUT items, real Task Engine tasks for the rest.
 */

const HR_ROLE = 'hrManager'
const FINANCE_ROLE = 'finance'

/**
 * §5 item 8's "backoffice staff and supervisor level and above" gate — no
 * position-tier data exists in the codebase, so this is a hand-curated
 * heuristic (user-confirmed): HQ backoffice departments always qualify;
 * every other department qualifies unless the position is rank-and-file.
 */
const BACKOFFICE_DEPARTMENTS = [
  'admin_general',
  'sales_marketing',
  'human_resources',
  'finance_accounting',
  'driver',
  'engineering_pomec',
]

const RANK_AND_FILE_POSITION_IDS = [
  'waiter',
  'runner',
  'cashier',
  'wholefoodsCashier',
  'barista',
  'barBack',
  'cook',
  'cookBaker',
  'cookHelper',
  'demiChefDePartie',
  'demiChefBaker',
  'steward',
  'publicAreaAttendant',
  'securityGuard',
  'trainee',
  'dailyWorker',
]

function requiresHandoverReview(departmentId: string, position: string): boolean {
  if (BACKOFFICE_DEPARTMENTS.includes(departmentId)) return true
  return !RANK_AND_FILE_POSITION_IDS.includes(position)
}

/** Active users holding `roleId`, falling back to the actor when the role has nobody active yet — same empty-org fallback onboarding.ts uses. */
async function resolveAssignees(roleId: string, actorUid: string): Promise<string[]> {
  const snap = await db.collection(COLLECTIONS.USERS).where('roleId', '==', roleId).where('status', '==', 'active').get()
  const uids = snap.docs.map((doc) => doc.id)
  return uids.length > 0 ? uids : [actorUid]
}

/**
 * Called from archiveEmployee once the employee record is updated. Returns
 * the new checklist id. Pure — the caller owns auth and audit.
 */
export async function createOffboardingChecklistInternal(input: {
  employeeId: string
  employeeName: string
  departmentId: string
  outletId: string
  position: string
  lastWorkingDate: string
  actorUid: string
}): Promise<string> {
  const documentChecklist = OFFBOARDING_DOCUMENT_ITEMS.map((item) => ({
    itemNumber: item.itemNumber,
    label: item.label,
    tier: item.tier,
    treatment: item.treatment,
    linkedRecordType: null,
    linkedRecordId: null,
    status: 'pending' as const,
    receivedDate: null,
    fileId: null,
  }))

  const ref = db.collection(COLLECTIONS.OFFBOARDING_CHECKLISTS).doc()

  const handoverRequired = requiresHandoverReview(input.departmentId, input.position)
  const leaderRole = DEPARTMENT_ROLES[input.departmentId]?.[0] ?? HR_ROLE

  const [hrAssignees, leaderAssignees, financeAssignees] = await Promise.all([
    resolveAssignees(HR_ROLE, input.actorUid),
    resolveAssignees(leaderRole, input.actorUid),
    resolveAssignees(FINANCE_ROLE, input.actorUid),
  ])

  const taskDefs: Array<{ title: string; taskType: Parameters<typeof createTaskInternal>[0]['taskType']; tag: string; assignedTo: string[] }> = [
    { title: `Return assets & uniform — ${input.employeeName}`, taskType: 'assetAssignment', tag: 'offboarding-assets', assignedTo: leaderAssignees },
    { title: `Document handover — ${input.employeeName}`, taskType: 'documentReview', tag: 'offboarding-docs', assignedTo: hrAssignees },
    ...(handoverRequired
      ? [{ title: `Task/work reassignment review — ${input.employeeName}`, taskType: 'custom' as const, tag: 'offboarding-reassignment', assignedTo: leaderAssignees }]
      : []),
    { title: `Final settlement calculation — ${input.employeeName}`, taskType: 'custom', tag: 'offboarding-settlement', assignedTo: financeAssignees },
    { title: `Exit interview — ${input.employeeName}`, taskType: 'custom', tag: 'offboarding-interview', assignedTo: hrAssignees },
    { title: `Issue certificate / reference letter — ${input.employeeName}`, taskType: 'custom', tag: 'offboarding-reference', assignedTo: hrAssignees },
    { title: `BPJS-TK closure letter — ${input.employeeName}`, taskType: 'custom', tag: 'offboarding-bpjs', assignedTo: hrAssignees },
  ]

  const taskIds = await Promise.all(
    taskDefs.map((task) =>
      createTaskInternal({
        title: task.title,
        description: `Offboarding for ${input.employeeName}. Checklist: ${ref.id}.`,
        taskType: task.taskType,
        sourceModule: 'hr',
        referenceId: ref.id,
        assignedTo: task.assignedTo,
        assignedBy: input.actorUid,
        priority: 'high',
        dueDate: input.lastWorkingDate,
        tags: ['offboarding', task.tag],
      }),
    ),
  )

  await ref.set({
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    departmentId: input.departmentId,
    outletId: input.outletId,
    lastWorkingDate: input.lastWorkingDate,
    documentChecklist,
    taskIds,
    handoverRequired,
    exitInterviewId: null,
    completedAt: null,
    ...newDocumentBaseFields(input.actorUid, 'inProgress'),
  })

  await notifyUsersByRole({
    role: HR_ROLE,
    module: 'hr',
    title: 'Offboarding started',
    message: `${input.employeeName} is exiting. The offboarding checklist is ready.`,
    referenceId: ref.id,
    priority: 'high',
  })

  return ref.id
}

/** Every mandatory-tier row has to be received (or explicitly not applicable) before the checklist can close. */
function outstandingMandatory(checklist: FirebaseFirestore.DocumentData): number {
  const items = (checklist.documentChecklist ?? []) as Array<{ tier: string; status: string }>
  return items.filter((item) => item.tier === 'mandatory' && item.status === 'pending').length
}

/**
 * Marks one checklist row received / not applicable, optionally attaching a
 * file. Rewrites the whole array because Firestore cannot update an element
 * of an array by index. Gated by employees.update — offboarding is
 * employee-scoped, same precedent as Contracts/Disciplinary Records.
 */
export const updateOffboardingItem = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_UPDATE)

    const { checklistId, itemNumber, itemStatus, fileId } = (request.data ?? {}) as {
      checklistId?: string
      itemNumber?: number
      itemStatus?: string
      fileId?: string
    }

    if (!checklistId || typeof itemNumber !== 'number') {
      throw new AppError('invalid-argument', 'checklistId and itemNumber are required.')
    }
    if (itemStatus !== 'pending' && itemStatus !== 'received' && itemStatus !== 'notApplicable') {
      throw new AppError('invalid-argument', 'itemStatus must be pending, received, or notApplicable.')
    }

    const ref = db.collection(COLLECTIONS.OFFBOARDING_CHECKLISTS).doc(checklistId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That offboarding checklist no longer exists.')
    }
    const checklist = snap.data()!
    if (checklist.status === 'completed') {
      throw new AppError('failed-precondition', 'That offboarding checklist is already complete.')
    }

    const items = (checklist.documentChecklist ?? []) as Array<Record<string, unknown>>
    const index = items.findIndex((item) => item.itemNumber === itemNumber)
    if (index === -1) {
      throw new AppError('not-found', `Item ${itemNumber} is not on this checklist.`)
    }

    const updated = items.map((item, position) =>
      position === index
        ? {
            ...item,
            status: itemStatus,
            receivedDate: itemStatus === 'received' ? todayIso() : null,
            fileId: fileId ?? item.fileId ?? null,
          }
        : item,
    )

    await ref.update({ documentChecklist: updated, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'OffboardingItemUpdated',
      category: 'HR',
      module: 'hr',
      resourceType: 'offboardingChecklist',
      resourceId: checklistId,
      action: 'update',
      user,
      previousValues: { itemNumber, status: items[index].status },
      newValues: { itemNumber, status: itemStatus, fileId: fileId ?? null },
    })

    return successResponse(
      { checklistId, outstandingMandatory: outstandingMandatory({ documentChecklist: updated }) },
      'Checklist updated.',
    )
  } catch (error) {
    return handleError(error)
  }
})

/** §8 criterion 1 (mirrored from onboarding) — refuses while any mandatory item is still pending. */
export const completeOffboarding = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_UPDATE)

    const { checklistId } = (request.data ?? {}) as { checklistId?: string }
    if (!checklistId) {
      throw new AppError('invalid-argument', 'checklistId is required.')
    }

    const ref = db.collection(COLLECTIONS.OFFBOARDING_CHECKLISTS).doc(checklistId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That offboarding checklist no longer exists.')
    }
    const checklist = snap.data()!
    if (checklist.status === 'completed') {
      throw new AppError('failed-precondition', 'That offboarding checklist is already complete.')
    }

    const outstanding = outstandingMandatory(checklist)
    if (outstanding > 0) {
      throw new AppError(
        'failed-precondition',
        `${outstanding} required document(s) are still outstanding.`,
      )
    }

    await ref.update({ status: 'completed', completedAt: todayIso(), ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'OffboardingCompleted',
      category: 'HR',
      module: 'hr',
      resourceType: 'offboardingChecklist',
      resourceId: checklistId,
      action: 'update',
      user,
      newValues: { status: 'completed', employeeId: checklist.employeeId },
    })

    return successResponse({ checklistId }, 'Offboarding complete.')
  } catch (error) {
    return handleError(error)
  }
})
