import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requireAnyPermission,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
  type AuthedUser,
} from '../../lib'
import type { WorkOrderPriority } from './helpers'

const PRIORITIES: WorkOrderPriority[] = ['critical', 'high', 'medium', 'low']

export interface CreateWorkOrderInput {
  title: string
  description: string
  location: string
  priority: WorkOrderPriority
  assignedToRole?: string
  sourceIncidentId?: string
}

/**
 * FEATURE_SPECIFICATIONS.md Module 5 — Engineering Work Orders. Extracted as
 * an internal helper (same precedent as createCalendarEventInternal /
 * createEmployeeInternal) so createIncidentReport's equipmentFailure path can
 * write through this one path instead of an inline doc write.
 */
export async function createWorkOrderInternal(user: AuthedUser, input: CreateWorkOrderInput): Promise<string> {
  if (!input.title || !input.description || !input.location || !PRIORITIES.includes(input.priority)) {
    throw new AppError('invalid-argument', 'title, description, location, and a valid priority are required.')
  }

  const ref = db.collection(COLLECTIONS.WORK_ORDERS).doc()
  await ref.set({
    title: input.title,
    description: input.description,
    location: input.location,
    priority: input.priority,
    assignedToRole: input.assignedToRole ?? 'engineering',
    assignedTo: null,
    resolutionNotes: null,
    sourceIncidentId: input.sourceIncidentId ?? null,
    ...newDocumentBaseFields(user.uid, 'open'),
  })

  await recordAuditEvent({
    eventType: 'WorkOrderCreated',
    category: 'Operations',
    module: 'operations',
    resourceType: 'workOrder',
    resourceId: ref.id,
    action: 'create',
    user,
    newValues: { title: input.title, priority: input.priority },
  })

  return ref.id
}

/** Manual creation route — engineering raises its own work orders; incidents create theirs via createWorkOrderInternal directly. */
export const createWorkOrder = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireAnyPermission(user, [PERMISSIONS.WORK_ORDERS_ASSIGN, PERMISSIONS.WORK_ORDERS_UPDATE])

    const input = (request.data ?? {}) as Partial<CreateWorkOrderInput>
    const workOrderId = await createWorkOrderInternal(user, input as CreateWorkOrderInput)

    return successResponse({ workOrderId }, 'Work order created.')
  } catch (error) {
    return handleError(error)
  }
})
