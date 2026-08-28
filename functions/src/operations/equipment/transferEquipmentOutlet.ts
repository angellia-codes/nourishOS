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
import { OUTLET_AREAS } from '../../lib/organization'

/**
 * equipment-master-design.md §5.4/AC #11 — outlet transfer, unapproved but
 * audit-logged. Deliberately does not touch `assetCode` (§3.5 — codes are
 * immutable; a transferred asset keeps the outlet it was issued under).
 *
 * `area` must re-validate against the *destination* outlet's list — the
 * source outlet's area has no meaning at the new location, and writing it
 * unchanged would violate the same constraint import enforces (§4.1).
 */
export const transferEquipmentOutlet = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EQUIPMENT_MANAGE)

    const { equipmentId, outletId, area } = (request.data ?? {}) as {
      equipmentId?: string
      outletId?: string
      area?: string
    }
    const id = typeof equipmentId === 'string' ? equipmentId.trim() : ''
    const destinationOutletId = typeof outletId === 'string' ? outletId : ''
    const destinationArea = typeof area === 'string' ? area : ''

    if (!id || !destinationOutletId || !destinationArea) {
      throw new AppError('invalid-argument', 'equipmentId, outletId, and area are required.')
    }
    if (!OUTLET_AREAS[destinationOutletId]?.includes(destinationArea)) {
      throw new AppError('invalid-argument', 'That area does not belong to the destination outlet.')
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
    if (previous.outletId === destinationOutletId && previous.area === destinationArea) {
      throw new AppError('failed-precondition', 'That is already this asset\'s outlet and area.')
    }

    await ref.update({ outletId: destinationOutletId, area: destinationArea, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'EquipmentTransferred',
      category: 'Engineering',
      module: 'operations',
      resourceType: 'equipment',
      resourceId: id,
      action: 'update',
      user,
      previousValues: { outletId: previous.outletId, area: previous.area },
      newValues: { outletId: destinationOutletId, area: destinationArea },
    })

    return successResponse(
      { equipmentId: id },
      `${previous.assetCode as string} transferred. Its asset code stays the same.`,
    )
  } catch (error) {
    return handleError(error)
  }
})
