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
import { validateExtinguisherFields, type ExtinguisherFields } from './helpers'

/** The editable half of a unit — what §6 says to audit-log before and after. */
function auditSnapshot(previous: FirebaseFirestore.DocumentData): ExtinguisherFields {
  return {
    departmentId: previous.departmentId,
    locationLabel: previous.locationLabel,
    extinguisherType: previous.extinguisherType,
    weightKg: previous.weightKg,
    serialNumber: previous.serialNumber ?? null,
    manufactureDate: previous.manufactureDate ?? null,
    installedAt: previous.installedAt,
    expiryDate: previous.expiryDate,
    lastRefillDate: previous.lastRefillDate ?? null,
    nextHydrostaticTestDate: previous.nextHydrostaticTestDate ?? null,
  }
}

/**
 * fire-extinguisher.md §6 — edits the register entry, never the unit's state.
 *
 * `assetCode` and `outletId` are not editable: the code is immutable by design
 * (§4.2) and it encodes the outlet, so moving a cylinder between outlets is a
 * retire-and-re-register, not an edit. `status`, `lastInspectedAt` and
 * `nextInspectionDue` are server-owned (§4.8) and equally untouchable here —
 * the same reason updateCheckpoint refuses to rewrite patrol state.
 */
export const updateFireExtinguisher = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.APAR_MANAGE)

    const input = (request.data ?? {}) as Record<string, unknown>
    const extinguisherId = typeof input.extinguisherId === 'string' ? input.extinguisherId.trim() : ''
    if (!extinguisherId) {
      throw new AppError('invalid-argument', 'extinguisherId is required.')
    }

    const ref = db.collection(COLLECTIONS.FIRE_EXTINGUISHERS).doc(extinguisherId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That extinguisher no longer exists.')
    }
    const previous = snap.data()!
    if (previous.isArchived) {
      throw new AppError('failed-precondition', 'That extinguisher has been retired.')
    }

    const fields = validateExtinguisherFields(input, previous.outletId as string)
    await ref.update({ ...fields, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'FireExtinguisherUpdated',
      category: 'Security',
      module: 'security',
      resourceType: 'fireExtinguisher',
      resourceId: extinguisherId,
      action: 'update',
      user,
      previousValues: auditSnapshot(previous),
      newValues: fields,
    })

    return successResponse({ extinguisherId }, `${previous.assetCode as string} updated.`)
  } catch (error) {
    return handleError(error)
  }
})
