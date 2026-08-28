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
import { findEquipmentBySerial, validateEquipmentFields } from './helpers'
import type { EquipmentFields } from './types'

/** The editable half of a record — what §8's audit log records before and after. */
function auditSnapshot(previous: FirebaseFirestore.DocumentData): EquipmentFields {
  return {
    name: previous.name,
    category: previous.category,
    equipmentType: previous.equipmentType ?? null,
    manufacturer: previous.manufacturer ?? null,
    model: previous.model ?? null,
    serialNumber: previous.serialNumber ?? null,
    outletId: previous.outletId,
    area: previous.area,
    locationDetail: previous.locationDetail ?? null,
    departmentId: previous.departmentId ?? null,
    criticality: previous.criticality,
    criticalityOverridden: Boolean(previous.criticalityOverridden),
    installDate: previous.installDate ?? null,
    warrantyExpiryDate: previous.warrantyExpiryDate ?? null,
    serviceVendorName: previous.serviceVendorName ?? null,
    notes: previous.notes ?? null,
  }
}

/**
 * equipment-master-design.md §7 — field edits. `assetCode` is immutable
 * (§3.5) and `outletId` moves only via transferEquipmentOutlet (its own
 * re-validation of `area` against the destination), so neither is accepted
 * here — same reasoning updateFireExtinguisher refuses `assetCode`/`outletId`.
 * `status` is likewise server-owned: use updateEquipmentStatus or the
 * decommission approval flow instead.
 */
export const updateEquipment = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EQUIPMENT_MANAGE)

    const input = (request.data ?? {}) as Record<string, unknown>
    const equipmentId = typeof input.equipmentId === 'string' ? input.equipmentId.trim() : ''
    if (!equipmentId) {
      throw new AppError('invalid-argument', 'equipmentId is required.')
    }

    const ref = db.collection(COLLECTIONS.EQUIPMENT).doc(equipmentId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That equipment no longer exists.')
    }
    const previous = snap.data()!
    if (previous.status === 'decommissioned') {
      throw new AppError('failed-precondition', 'That equipment has been decommissioned.')
    }

    const fields = validateEquipmentFields(input, previous.outletId as string)

    if (fields.serialNumber && fields.serialNumber !== previous.serialNumber) {
      const existing = await findEquipmentBySerial(fields.serialNumber, equipmentId)
      if (existing) {
        throw new AppError('already-exists', 'That serial number is already registered.')
      }
    }

    await ref.update({ ...fields, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'EquipmentUpdated',
      category: 'Engineering',
      module: 'operations',
      resourceType: 'equipment',
      resourceId: equipmentId,
      action: 'update',
      user,
      previousValues: auditSnapshot(previous),
      newValues: fields,
    })

    return successResponse({ equipmentId }, `${previous.assetCode as string} updated.`)
  } catch (error) {
    return handleError(error)
  }
})
