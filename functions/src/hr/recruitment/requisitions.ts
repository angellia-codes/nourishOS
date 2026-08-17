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
  AppError,
  handleError,
  successResponse,
  type AuthedUser,
} from '../../lib'
import { submitApprovalInternal } from '../../shared/approval'
import { sendNotificationInternal } from '../../shared/notifications'
import { positionsFor } from '../../lib/positions'
import {
  EMPLOYMENT_TYPES,
  REQUISITION_TYPES,
  URGENCIES,
  allocateRequisitionNumber,
  isRecruitmentManager,
  requireIsoDate,
  requireOneOf,
  requireOutletAndDepartment,
  requireRecruitmentPermission,
  requireText,
} from './helpers'

/**
 * Employee Requisition (manpower request) — employee-requisition.md.
 *
 * Two status fields, not one (§2): `status` is the approval lifecycle owned by
 * the Approval Engine, `vacancyStage` is the recruitment lifecycle and stays
 * null until the requisition is approved. A vacancy can never be open before
 * its approval completes, and candidates can only be raised against an
 * approved requisition (§10 criterion 6, enforced in candidates.ts).
 *
 * One confirmed, permanent deviation from that spec: the approval chain is
 * fixed — hrManager → generalManager, registered in shared/approval/routes.ts
 * as 'hr/requisition' — regardless of `budgeted`. §5's conditional Director
 * step for unbudgeted requests is a deliberate product decision NOT to build,
 * not an unfinished gap: Director keeps read-only access to requisitions,
 * full stop. `budgeted` is still captured on the record (it's part of the
 * justification a leader raises), it just never reaches the approval route.
 */

/** A type alias, not an interface — recordAuditEvent's Record<string, unknown> fields need the implicit index signature. */
type RequisitionFields = {
  outletId: string
  departmentId: string
  position: string
  openings: number
  employmentType: string
  contractMonths: number | null
  requisitionType: string
  replacingEmployeeId: string | null
  targetJoinDate: string
  urgency: string
  justification: string
  responsibilities: string
  requirements: string
  workSchedule: string
  budgeted: boolean
}

async function validateFields(input: Record<string, unknown>): Promise<RequisitionFields> {
  const { outletId, departmentId } = requireOutletAndDepartment(input.outletId, input.departmentId)

  const openings = Number(input.openings)
  if (!Number.isInteger(openings) || openings < 1) {
    throw new AppError('invalid-argument', 'Number of openings must be a whole number of at least 1.')
  }

  const employmentType = requireOneOf(input.employmentType, EMPLOYMENT_TYPES, 'Employment type')
  const requisitionType = requireOneOf(input.requisitionType, REQUISITION_TYPES, 'Requisition type')

  // §3 Section A: contract duration is required for fixed-term hires, and a
  // replacement has to name who is being replaced — otherwise "replacement"
  // carries no more information than "new position".
  let contractMonths: number | null = null
  if (employmentType === 'fixed_term') {
    contractMonths = Number(input.contractMonths)
    if (!Number.isInteger(contractMonths) || contractMonths < 1 || contractMonths > 60) {
      throw new AppError('invalid-argument', 'Contract duration must be between 1 and 60 months.')
    }
  }

  let replacingEmployeeId: string | null = null
  if (requisitionType === 'replacement') {
    replacingEmployeeId = requireText(input.replacingEmployeeId, 'Replacing employee', 200)
    // Same "assigned manager must be an active employee" check createEmployee.ts
    // already makes — a replacement has to name a real, currently-active hire.
    const replacingSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(replacingEmployeeId).get()
    if (!replacingSnap.exists || replacingSnap.data()?.status !== 'active') {
      throw new AppError('failed-precondition', 'Replacing employee must be an active employee.')
    }
  }

  const position = requireText(input.position, 'Position', 120)
  // Same POSITIONS.md §3 catalog createEmployee.ts/updateEmployee.ts already
  // validate against — a requisition's target title has to be a real,
  // department-scoped position, not free text.
  if (!positionsFor(outletId, departmentId).includes(position)) {
    throw new AppError('invalid-argument', 'Select a valid position for this department.')
  }

  return {
    outletId,
    departmentId,
    position,
    openings,
    employmentType,
    contractMonths,
    requisitionType,
    replacingEmployeeId,
    targetJoinDate: requireIsoDate(input.targetJoinDate, 'Target join date'),
    urgency: requireOneOf(input.urgency, URGENCIES, 'Urgency'),
    justification: requireText(input.justification, 'Business justification', 2000),
    responsibilities: requireText(input.responsibilities, 'Key responsibilities', 2000),
    requirements: requireText(input.requirements, 'Requirements', 2000),
    workSchedule: requireText(input.workSchedule, 'Work schedule', 500),
    budgeted: input.budgeted === true,
  }
}

/** Loads a requisition or throws — every callable below starts here. */
async function loadRequisition(requisitionId: string) {
  if (!requisitionId) {
    throw new AppError('invalid-argument', 'requisitionId is required.')
  }
  const ref = db.collection(COLLECTIONS.RECRUITMENTS).doc(requisitionId)
  const snap = await ref.get()
  if (!snap.exists) {
    throw new AppError('not-found', 'That requisition no longer exists.')
  }
  return { ref, data: snap.data()! }
}

/**
 * A leader may only act on their own requisitions; HR and above act on any.
 * Outlet scoping (employee-requisition.md §7) rides on the same check — a
 * leader can only create for their own outlet, so ownership implies it.
 */
function requireOwnerOrManager(user: AuthedUser, requisition: FirebaseFirestore.DocumentData): void {
  if (requisition.createdBy === user.uid || isRecruitmentManager(user)) return
  throw new AppError('permission-denied', 'You can only act on requisitions you raised.')
}

export const createRequisition = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireRecruitmentPermission(user, PERMISSIONS.RECRUITMENT_CREATE)

    const fields = await validateFields((request.data ?? {}) as Record<string, unknown>)

    // §7: leaders raise requisitions for their own outlet only. HR/GM/Director
    // carry recruitment.update and are cross-outlet by design.
    if (fields.outletId !== user.outletId && !isRecruitmentManager(user)) {
      throw new AppError('permission-denied', 'You can only raise a requisition for your own outlet.')
    }

    const ref = db.collection(COLLECTIONS.RECRUITMENTS).doc()
    await ref.set({
      ...fields,
      requisitionNumber: null, // allocated on submit, so drafts don't burn numbers
      vacancyStage: null,
      approvalRequestId: null,
      hiredCandidateIds: [],
      filledCount: 0,
      ...newDocumentBaseFields(user.uid, 'draft'),
    })

    await recordAuditEvent({
      eventType: 'RequisitionCreated',
      category: 'HR',
      module: 'hr',
      resourceType: 'requisition',
      resourceId: ref.id,
      action: 'create',
      user,
      newValues: fields,
    })

    return successResponse({ requisitionId: ref.id }, 'Requisition saved as a draft.')
  } catch (error) {
    return handleError(error)
  }
})

export const updateRequisition = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireRecruitmentPermission(user, PERMISSIONS.RECRUITMENT_CREATE)

    const data = (request.data ?? {}) as Record<string, unknown>
    const { ref, data: previous } = await loadRequisition(String(data.requisitionId ?? '').trim())
    requireOwnerOrManager(user, previous)

    // Editable only while it is still a draft — once submitted, the approval
    // chain is evaluating a snapshot and moving the goalposts under an approver
    // would make the audit trail a lie.
    if (previous.status !== 'draft') {
      throw new AppError('failed-precondition', 'Only a draft requisition can be edited.')
    }

    const fields = await validateFields(data)
    await ref.update({ ...fields, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'RequisitionUpdated',
      category: 'HR',
      module: 'hr',
      resourceType: 'requisition',
      resourceId: ref.id,
      action: 'update',
      user,
      previousValues: { position: previous.position, openings: previous.openings, urgency: previous.urgency },
      newValues: fields,
    })

    return successResponse({ requisitionId: ref.id }, 'Requisition updated.')
  } catch (error) {
    return handleError(error)
  }
})

/**
 * Draft → pending approval. The requisition number is allocated here rather
 * than at creation so abandoned drafts don't leave gaps in the year's sequence
 * (§10 criterion 5: unique and sequential per year).
 */
export const submitRequisition = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireRecruitmentPermission(user, PERMISSIONS.RECRUITMENT_CREATE)

    const { requisitionId } = (request.data ?? {}) as { requisitionId?: string }
    const { ref, data: requisition } = await loadRequisition(String(requisitionId ?? '').trim())
    requireOwnerOrManager(user, requisition)

    if (requisition.status !== 'draft') {
      throw new AppError('failed-precondition', 'That requisition has already been submitted.')
    }

    const requisitionNumber = requisition.requisitionNumber ?? (await allocateRequisitionNumber())

    // The route is server-owned (shared/approval/routes.ts, 'hr/requisition');
    // notifying the first approver happens inside submitApprovalInternal.
    const approvalRequestId = await submitApprovalInternal({
      module: 'hr',
      resourceType: 'requisition',
      resourceId: ref.id,
      requestedBy: user.uid,
      priority: requisition.urgency === 'critical' ? 'critical' : 'medium',
    })

    await ref.update({
      requisitionNumber,
      status: 'pending_approval',
      approvalRequestId,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'RequisitionSubmitted',
      category: 'HR',
      module: 'hr',
      resourceType: 'requisition',
      resourceId: ref.id,
      action: 'submit',
      user,
      newValues: { requisitionNumber, approvalRequestId },
    })

    return successResponse(
      { requisitionId: ref.id, requisitionNumber },
      `${requisitionNumber} submitted for HR Manager and GM approval.`,
    )
  } catch (error) {
    return handleError(error)
  }
})

/**
 * Cancellable at any status except completed (§6). Cancelling an approved
 * requisition that still has live candidates is allowed but requires
 * `confirm: true` — the candidates keep their records; what disappears is the
 * vacancy they were being hired into.
 */
export const cancelRequisition = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireRecruitmentPermission(user, PERMISSIONS.RECRUITMENT_CREATE)

    const { requisitionId, reason, confirm } = (request.data ?? {}) as {
      requisitionId?: string
      reason?: string
      confirm?: boolean
    }
    const { ref, data: requisition } = await loadRequisition(String(requisitionId ?? '').trim())
    requireOwnerOrManager(user, requisition)

    if (requisition.status === 'completed' || requisition.status === 'cancelled') {
      throw new AppError('failed-precondition', 'That requisition can no longer be cancelled.')
    }

    if (requisition.status === 'approved') {
      const live = await db
        .collection(COLLECTIONS.CANDIDATES)
        .where('requisitionId', '==', ref.id)
        .where('isArchived', '==', false)
        .get()

      if (!live.empty) {
        if (confirm !== true) {
          throw new AppError(
            'failed-precondition',
            'This requisition still has candidates in the pipeline. Confirm to cancel it anyway.',
          )
        }

        // §6: cancelling an approved requisition with active candidates
        // notifies whoever still has an interview scheduled against one of them.
        const candidateIds = live.docs.map((doc) => doc.id)
        const interviewSnap = await db
          .collection(COLLECTIONS.INTERVIEWS)
          .where('candidateId', 'in', candidateIds.slice(0, 30))
          .where('outcome', '==', 'pending')
          .get()

        const interviewerUids = new Set(interviewSnap.docs.map((doc) => doc.data().interviewerUid as string))
        await Promise.all(
          Array.from(interviewerUids).map((interviewerUid) =>
            sendNotificationInternal({
              type: 'alert',
              title: 'Requisition cancelled',
              message: `${(requisition.requisitionNumber as string | null) ?? 'The requisition'} was cancelled. Your scheduled interview's candidate no longer has an open vacancy to be hired into.`,
              module: 'hr',
              priority: 'high',
              recipientUid: interviewerUid,
              senderUid: user.uid,
              referenceModule: 'hr',
              referenceId: ref.id,
            }),
          ),
        )
      }
    }

    await ref.update({
      status: 'cancelled',
      vacancyStage: requisition.vacancyStage ? 'closed' : null,
      cancellationReason: reason?.trim() || null,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'RequisitionCancelled',
      category: 'HR',
      module: 'hr',
      resourceType: 'requisition',
      resourceId: ref.id,
      action: 'cancel',
      user,
      severity: 'high',
      previousValues: { status: requisition.status },
      newValues: { status: 'cancelled', reason: reason?.trim() || null },
    })

    return successResponse({ requisitionId: ref.id }, 'Requisition cancelled.')
  } catch (error) {
    return handleError(error)
  }
})
