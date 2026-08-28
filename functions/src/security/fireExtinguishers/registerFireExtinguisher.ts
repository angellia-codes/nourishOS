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
import { OUTLET_DEPARTMENTS } from '../../lib/organization'
import {
  allocateAssetCode,
  currentPeriodMonth,
  periodMonthEnd,
  validateExtinguisherFields,
} from './helpers'

/**
 * fire-extinguisher.md §6 — one document per physical cylinder (§2.1: `qty` is
 * not a field anywhere in this module, counts are derived). The asset code is
 * allocated server-side and immutable, because it is what a regulatory audit
 * asks a unit's history by.
 *
 * A unit registered mid-month is due in the round already generated for that
 * month (§5.1's live register read), so `nextInspectionDue` starts at the end
 * of the current month rather than the next one.
 */
export const registerFireExtinguisher = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.APAR_MANAGE)

    const input = (request.data ?? {}) as Record<string, unknown>
    const outletId = typeof input.outletId === 'string' ? input.outletId : ''
    if (!OUTLET_DEPARTMENTS[outletId]) {
      throw new AppError('invalid-argument', 'Select a valid outlet.')
    }

    const fields = validateExtinguisherFields(input, outletId)
    const assetCode = await allocateAssetCode(outletId)

    const ref = db.collection(COLLECTIONS.FIRE_EXTINGUISHERS).doc()
    await ref.set({
      assetCode,
      outletId,
      ...fields,
      lastInspectedAt: null,
      nextInspectionDue: periodMonthEnd(currentPeriodMonth()),
      // §12 — QR scanning is out of MVP; the field is reserved so the round
      // screen can start reading it without a migration.
      qrCode: null,
      ...newDocumentBaseFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'FireExtinguisherRegistered',
      category: 'Security',
      module: 'security',
      resourceType: 'fireExtinguisher',
      resourceId: ref.id,
      action: 'create',
      user,
      newValues: { assetCode, outletId, ...fields },
    })

    return successResponse({ extinguisherId: ref.id, assetCode }, `Registered ${assetCode}.`)
  } catch (error) {
    return handleError(error)
  }
})
