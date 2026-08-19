import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { sendNotificationInternal } from '../../shared/notifications'
import { WORK_ORDER_NEXT_STATUS, WORK_ORDER_PHOTO_AFTER, type WorkOrderStatus } from './helpers'

interface UpdateWorkOrderStatusInput {
  workOrderId: string
  status: WorkOrderStatus
  /** Omitted on an `assigned` move means the caller is accepting the job themselves. */
  assignedTo?: string
  /** Required on `inProgress` — the "still working on it" note, appended to progressNotes. */
  notes?: string
  resolutionNotes?: string
}

/**
 * Permission required per transition — separate strings, same reasoning as
 * expenseRequests.approve vs .pay: assigning, doing the work, and signing it
 * off complete are different actions with different risk.
 */
const PERMISSION_FOR_STATUS: Partial<Record<WorkOrderStatus, string>> = {
  assigned: PERMISSIONS.WORK_ORDERS_ASSIGN,
  inProgress: PERMISSIONS.WORK_ORDERS_UPDATE,
  completed: PERMISSIONS.WORK_ORDERS_COMPLETE,
  closed: PERMISSIONS.WORK_ORDERS_UPDATE,
}

/** FEATURE_SPECIFICATIONS.md Module 5. Forward-only per WORK_ORDER_NEXT_STATUS, mirroring updateIncidentStatus. */
export const updateWorkOrderStatus = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)

    const input = (request.data ?? {}) as Partial<UpdateWorkOrderStatusInput>
    if (!input.workOrderId || !input.status) {
      throw new AppError('invalid-argument', 'workOrderId and status are required.')
    }

    const requiredPermission = PERMISSION_FOR_STATUS[input.status]
    if (!requiredPermission) {
      throw new AppError('invalid-argument', `Unknown status "${input.status}".`)
    }
    requirePermission(user, requiredPermission)

    const ref = db.collection(COLLECTIONS.WORK_ORDERS).doc(input.workOrderId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Work order not found.')
    }
    const workOrder = snap.data()!

    if (WORK_ORDER_NEXT_STATUS[workOrder.status as WorkOrderStatus] !== input.status) {
      throw new AppError('failed-precondition', `Cannot move from ${workOrder.status} to ${input.status}.`)
    }
    // An engineer accepting the job is the same transition as a manager
    // assigning it — the only difference is who ends up in assignedTo, so
    // acceptance is the default rather than a second callable.
    const assignedTo = input.status === 'assigned' ? (input.assignedTo || user.uid) : undefined

    if (input.status === 'inProgress' && !input.notes?.trim()) {
      throw new AppError('invalid-argument', 'A progress note is required while the job is still open.')
    }
    if (input.status === 'completed') {
      if (!input.resolutionNotes) {
        throw new AppError('invalid-argument', 'resolutionNotes is required to complete a work order.')
      }
      // "Done" has to be evidenced, not asserted: the after photo is a
      // precondition of completion, checked here rather than only in the UI.
      const afterPhotos = await db
        .collection(COLLECTIONS.FILES)
        .where('resourceType', '==', WORK_ORDER_PHOTO_AFTER)
        .where('resourceId', '==', ref.id)
        .where('fileStatus', '==', 'available')
        .limit(1)
        .get()
      if (afterPhotos.empty) {
        throw new AppError('failed-precondition', 'Upload an after photo before completing this work order.')
      }
    }

    const updates: Record<string, unknown> = { status: input.status, ...updatedFields(user.uid) }
    if (assignedTo) updates.assignedTo = assignedTo
    if (input.status === 'inProgress') {
      const progressNotes = (workOrder.progressNotes as unknown[] | undefined) ?? []
      updates.progressNotes = [
        ...progressNotes,
        { note: input.notes!.trim(), by: user.uid, at: new Date().toISOString() },
      ]
    }
    if (input.status === 'completed') updates.resolutionNotes = input.resolutionNotes

    await ref.update(updates)

    await recordAuditEvent({
      eventType: 'WorkOrderStatusChanged',
      category: 'Operations',
      module: 'operations',
      resourceType: 'workOrder',
      resourceId: ref.id,
      action: 'update',
      user,
      previousValues: { status: workOrder.status },
      newValues: { status: input.status },
    })

    if (workOrder.createdBy && workOrder.createdBy !== user.uid) {
      await sendNotificationInternal({
        type: 'alert',
        title: 'Work Order Updated',
        message: `"${workOrder.title}" is now ${input.status}.`,
        module: 'operations',
        priority: 'medium',
        recipientUid: workOrder.createdBy,
        referenceModule: 'operations',
        referenceId: ref.id,
      })
    }

    return successResponse({ workOrderId: ref.id }, 'Work order updated.')
  } catch (error) {
    return handleError(error)
  }
})
