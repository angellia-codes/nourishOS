import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { validateRequisition, type RequisitionInput } from './helpers'

// employee-requisition.md §7 — create the Draft. The requisition number is NOT
// allocated here (it's generated at submit, §7), and vacancyStage stays null
// until approval completes (§2 — it cannot be "open" before approved).
// Outlet scoping (own-outlet for managers) is enforced at submit against the
// requester's profile, same as the read-side rules.
export const createRequisition = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.RECRUITMENT_CREATE)

    const clean = validateRequisition((request.data ?? {}) as RequisitionInput)

    const requisitionRef = db.collection(COLLECTIONS.RECRUITMENTS).doc()
    await requisitionRef.set({
      requisitionNumber: null, // allocated at submit
      ...clean,
      // Outlet/department are the requester's own (§7 — managers raise for their
      // own outlet). Cross-outlet raising by HR needs a picker fed by the real
      // master lists; deferred to when those are wired.
      outletId: user.outletId,
      departmentId: user.departmentId,
      vacancyStage: null,
      approvalRequestId: null,
      requestedBy: user.uid,
      requestedByName: user.displayName,
      hiredCandidateIds: [],
      filledCount: 0,
      rejectionReason: null,
      ...newDocumentBaseFields(user.uid, 'draft'),
    })

    await recordAuditEvent({
      eventType: 'RequisitionCreated',
      category: 'HR',
      module: 'recruitment',
      resourceType: 'requisition',
      resourceId: requisitionRef.id,
      action: 'create',
      user,
      newValues: { positionId: clean.positionId, openings: clean.openings, budgeted: clean.budgeted },
    })

    return successResponse({ requisitionId: requisitionRef.id }, 'Requisition draft created.')
  } catch (error) {
    handleError(error)
  }
})
