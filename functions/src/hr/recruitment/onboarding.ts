import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  PERMISSIONS,
  requireActiveUser,
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
import { ONBOARDING_DOCUMENT_ITEMS } from './onboardingItems'
import { requireRecruitmentPermission } from './helpers'

/**
 * Onboarding — employee-onboarding-exit-checklist.md.
 *
 * §2's architecture decision, followed as written: the 28-item IN list is an
 * embedded array on one checklist document, not 28 Task Engine tasks (that
 * would be unusable noise). Only the handful of genuinely separate workstreams
 * — document review, account creation, asset assignment — become tasks.
 *
 * Completion is derived, not clicked: `mandatory` (*) items block, `followUp`
 * (**) items stay outstanding without blocking, and `optional` items never
 * block and never nudge.
 *
 * Not built here: the OUT/exit checklist, and the auto-generated clearance
 * statement PDF (§5 item 2) — this pass covers hiring only.
 */

/** Roles that receive the generated onboarding tasks. */
const HR_ROLE = 'hrManager'

/**
 * Called from moveCandidateStage when a candidate reaches ST-06 (Hired).
 * Returns the new checklist id. Pure — the caller owns auth and audit.
 */
export async function createOnboardingChecklistInternal(input: {
  candidateId: string
  candidateName: string
  requisitionId: string
  outletId: string
  departmentId: string
  joinDate: string | null
  actorUid: string
}): Promise<string> {
  // Recruitment artifacts (§4 items 1, 2, 18–21, 30) are already on file, so
  // they are generated pre-linked to the record that produced them instead of
  // prompting HR to upload a copy of something the system already holds.
  const documentChecklist = ONBOARDING_DOCUMENT_ITEMS.map((item) => ({
    itemNumber: item.itemNumber,
    label: item.label,
    tier: item.tier,
    treatment: item.treatment,
    linkedRecordType: item.linkedRecordType ?? null,
    linkedRecordId:
      item.linkedRecordType === 'candidate'
        ? input.candidateId
        : item.linkedRecordType === 'requisition'
          ? input.requisitionId
          : null,
    status: 'pending',
    receivedDate: null,
    fileId: null,
  }))

  const ref = db.collection(COLLECTIONS.ONBOARDING_CHECKLISTS).doc()

  const hrUsers = await db
    .collection(COLLECTIONS.USERS)
    .where('roleId', '==', HR_ROLE)
    .where('status', '==', 'active')
    .get()
  const hrUids = hrUsers.docs.map((doc) => doc.id)

  // No HR Manager account exists on a fresh install; fall back to whoever
  // hired the candidate rather than throwing away the tasks entirely.
  const assignees = hrUids.length > 0 ? hrUids : [input.actorUid]

  const taskIds = await Promise.all(
    [
      { title: `Collect onboarding documents — ${input.candidateName}`, taskType: 'documentReview' as const, tag: 'onboarding-docs' },
      { title: `Create system account — ${input.candidateName}`, taskType: 'checklist' as const, tag: 'onboarding-account' },
      { title: `Assign assets & uniform — ${input.candidateName}`, taskType: 'assetAssignment' as const, tag: 'onboarding-assets' },
    ].map((task) =>
      createTaskInternal({
        title: task.title,
        description: `Onboarding for ${input.candidateName}. Checklist: ${ref.id}.`,
        taskType: task.taskType,
        sourceModule: 'hr',
        referenceId: ref.id,
        assignedTo: assignees,
        assignedBy: input.actorUid,
        priority: 'high',
        dueDate: input.joinDate ?? undefined,
        tags: ['onboarding', task.tag],
      }),
    ),
  )

  await ref.set({
    candidateId: input.candidateId,
    candidateName: input.candidateName,
    requisitionId: input.requisitionId,
    outletId: input.outletId,
    departmentId: input.departmentId,
    employeeId: null,
    joinDate: input.joinDate,
    documentChecklist,
    taskIds,
    completedAt: null,
    ...newDocumentBaseFields(input.actorUid, 'inProgress'),
  })

  await notifyUsersByRole({
    role: HR_ROLE,
    module: 'hr',
    title: 'Onboarding started',
    message: `${input.candidateName} was hired. The onboarding checklist is ready.`,
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
 * file or linking the record that satisfies it. Rewrites the whole array
 * because Firestore cannot update an element of an array by index.
 */
export const updateOnboardingItem = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireRecruitmentPermission(user, PERMISSIONS.RECRUITMENT_UPDATE)

    const { checklistId, itemNumber, itemStatus, fileId, linkedRecordId } = (request.data ?? {}) as {
      checklistId?: string
      itemNumber?: number
      itemStatus?: string
      fileId?: string
      linkedRecordId?: string
    }

    if (!checklistId || typeof itemNumber !== 'number') {
      throw new AppError('invalid-argument', 'checklistId and itemNumber are required.')
    }
    if (itemStatus !== 'pending' && itemStatus !== 'received' && itemStatus !== 'notApplicable') {
      throw new AppError('invalid-argument', 'itemStatus must be pending, received, or notApplicable.')
    }

    const ref = db.collection(COLLECTIONS.ONBOARDING_CHECKLISTS).doc(checklistId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That onboarding checklist no longer exists.')
    }
    const checklist = snap.data()!
    if (checklist.status === 'completed') {
      throw new AppError('failed-precondition', 'That onboarding checklist is already complete.')
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
            linkedRecordId: linkedRecordId ?? item.linkedRecordId ?? null,
          }
        : item,
    )

    await ref.update({ documentChecklist: updated, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'OnboardingItemUpdated',
      category: 'HR',
      module: 'hr',
      resourceType: 'onboardingChecklist',
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

/** §8 criterion 1 — refuses while any mandatory item is still pending. */
export const completeOnboarding = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireRecruitmentPermission(user, PERMISSIONS.RECRUITMENT_UPDATE)

    const { checklistId } = (request.data ?? {}) as { checklistId?: string }
    if (!checklistId) {
      throw new AppError('invalid-argument', 'checklistId is required.')
    }

    const ref = db.collection(COLLECTIONS.ONBOARDING_CHECKLISTS).doc(checklistId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That onboarding checklist no longer exists.')
    }
    const checklist = snap.data()!
    if (checklist.status === 'completed') {
      throw new AppError('failed-precondition', 'That onboarding checklist is already complete.')
    }

    const outstanding = outstandingMandatory(checklist)
    if (outstanding > 0) {
      throw new AppError(
        'failed-precondition',
        `${outstanding} required document(s) are still outstanding. Follow-up and optional items don't block.`,
      )
    }

    await ref.update({ status: 'completed', completedAt: todayIso(), ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'OnboardingCompleted',
      category: 'HR',
      module: 'hr',
      resourceType: 'onboardingChecklist',
      resourceId: checklistId,
      action: 'update',
      user,
      newValues: { status: 'completed', candidateId: checklist.candidateId },
    })

    return successResponse({ checklistId }, 'Onboarding complete.')
  } catch (error) {
    return handleError(error)
  }
})
