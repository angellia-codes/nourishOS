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

const ROUTINE_STATUSES = ['active', 'underRepair'] as const
type RoutineStatus = (typeof ROUTINE_STATUSES)[number]

/**
 * equipment-master-design.md §5.1/AC #9 — `active` <-> `underRepair` only,
 * ungated by approval (an engineer marking a chiller down at 02:00 cannot
 * wait for a manager, §5.1's own reasoning). `decommissioned` is explicitly
 * rejected here — it is server-owned, set only by
 * onEquipmentDecommissionResolved once the outlet manager approves.
 */
export const updateEquipmentStatus = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EQUIPMENT_MANAGE)

    const { equipmentId, status } = (request.data ?? {}) as { equipmentId?: string; status?: string }
    const id = typeof equipmentId === 'string' ? equipmentId.trim() : ''
    if (!id || !ROUTINE_STATUSES.includes(status as RoutineStatus)) {
      throw new AppError('invalid-argument', `equipmentId and status (one of: ${ROUTINE_STATUSES.join(', ')}) are required.`)
    }

    const ref = db.collection(COLLECTIONS.EQUIPMENT).doc(id)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That equipment no longer exists.')
    }
    const previous = snap.data()!
    if (previous.status === 'decommissioned') {
      throw new AppError('failed-precondition', 'That equipment has been decommissioned.')
    }

    await ref.update({ status, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'EquipmentStatusChanged',
      category: 'Engineering',
      module: 'operations',
      resourceType: 'equipment',
      resourceId: id,
      action: 'update',
      user,
      previousValues: { status: previous.status },
      newValues: { status },
    })

    return successResponse({ equipmentId: id, status }, `${previous.assetCode as string} is now ${status}.`)
  } catch (error) {
    return handleError(error)
  }
})
