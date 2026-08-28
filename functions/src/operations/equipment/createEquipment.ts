import { onCall } from 'firebase-functions/v2/https'
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
} from '../../lib'
import { OUTLET_AREAS } from '../../lib/organization'
import { allocateEquipmentAssetCode, findEquipmentBySerial, validateEquipmentFields } from './helpers'

/**
 * equipment-master-design.md §7/§9 AC #2 — single-record create. The asset
 * code is allocated server-side and immutable, same reasoning
 * registerFireExtinguisher gives for its own code.
 */
export const createEquipment = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EQUIPMENT_MANAGE)

    const input = (request.data ?? {}) as Record<string, unknown>
    const outletId = typeof input.outletId === 'string' ? input.outletId : ''
    if (!OUTLET_AREAS[outletId]) {
      throw new AppError('invalid-argument', 'Select a valid outlet.')
    }

    const fields = validateEquipmentFields(input, outletId)

    if (fields.serialNumber) {
      const existing = await findEquipmentBySerial(fields.serialNumber)
      if (existing) {
        throw new AppError('already-exists', 'That serial number is already registered.')
      }
    }

    const assetCode = await allocateEquipmentAssetCode(outletId, fields.category)

    const ref = db.collection(COLLECTIONS.EQUIPMENT).doc()
    await ref.set({
      assetCode,
      ...fields,
      decommissionedAt: null,
      decommissionedBy: null,
      decommissionReason: null,
      decommissionApprovalRequestId: null,
      photoFileId: null,
      ...newDocumentBaseFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'EquipmentCreated',
      category: 'Engineering',
      module: 'operations',
      resourceType: 'equipment',
      resourceId: ref.id,
      action: 'create',
      user,
      newValues: { assetCode, ...fields },
    })

    return successResponse({ equipmentId: ref.id, assetCode }, `Registered ${assetCode}.`)
  } catch (error) {
    return handleError(error)
  }
})
