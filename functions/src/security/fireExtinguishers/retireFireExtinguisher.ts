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

/**
 * fire-extinguisher.md §6 — decommission a cylinder.
 *
 * Soft, like every business record here: the unit drops out of the register
 * list, the monthly rounds and the expiry sweep, while its inspection history
 * stays readable for the twelve-month audit export (§Kebijakan 4 — records are
 * retained, never deleted). A reason is required because "why is this unit
 * gone" is exactly what an auditor asks; re-retiring is a no-op that succeeds,
 * matching archiveCheckpoint.
 */
export const retireFireExtinguisher = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.APAR_MANAGE)

    const { extinguisherId, reason } = (request.data ?? {}) as { extinguisherId?: string; reason?: string }
    const id = typeof extinguisherId === 'string' ? extinguisherId.trim() : ''
    const retiredReason = typeof reason === 'string' ? reason.trim() : ''
    if (!id || !retiredReason) {
      throw new AppError('invalid-argument', 'extinguisherId and reason are required.')
    }

    const ref = db.collection(COLLECTIONS.FIRE_EXTINGUISHERS).doc(id)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That extinguisher no longer exists.')
    }
    const previous = snap.data()!

    await ref.update({
      status: 'retired',
      isArchived: true,
      retiredReason,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'FireExtinguisherRetired',
      category: 'Security',
      module: 'security',
      resourceType: 'fireExtinguisher',
      resourceId: id,
      action: 'delete',
      user,
      previousValues: { assetCode: previous.assetCode, status: previous.status, outletId: previous.outletId },
      newValues: { status: 'retired', retiredReason },
    })

    return successResponse({ extinguisherId: id }, `${previous.assetCode as string} retired.`)
  } catch (error) {
    return handleError(error)
  }
})
