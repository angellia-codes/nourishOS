import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
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

interface ClaimLostFoundItemInput {
  itemId: string
  claimantName: string
  claimantPhone?: string
  claimantEmail?: string
  claimantCustomerId?: string
  identifyingDetailsGiven: string
  idVerified: boolean
}

/**
 * lost-and-found-report.md §7/§10. Single-step claim + return — the demo's
 * "Record Claim & Return" action collapses the doc's claimPending → returned
 * transition into one call rather than two, since nothing in the spec's
 * acceptance criteria requires them to be separate Cloud Function calls.
 */
export const claimLostFoundItem = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.LOST_FOUND_MANAGE)

    const input = (request.data ?? {}) as Partial<ClaimLostFoundItemInput>

    if (!input.itemId || !input.claimantName || !input.identifyingDetailsGiven) {
      throw new AppError('invalid-argument', 'itemId, claimantName, and identifyingDetailsGiven are required.')
    }
    if (!input.claimantPhone && !input.claimantEmail) {
      throw new AppError('invalid-argument', 'At least one of claimantPhone or claimantEmail is required.')
    }

    const itemRef = db.collection(COLLECTIONS.LOST_FOUND_ITEMS).doc(input.itemId)
    const itemSnap = await itemRef.get()
    if (!itemSnap.exists) {
      throw new AppError('not-found', 'Lost & found item not found.')
    }
    const item = itemSnap.data()!

    if (item.status !== 'logged' && item.status !== 'claimPending') {
      throw new AppError('failed-precondition', `Item is already ${item.status} and cannot be claimed.`)
    }
    if (item.valueTier !== 'low' && !input.idVerified) {
      throw new AppError('invalid-argument', 'ID verification is required to release a medium/high value item.')
    }

    await itemRef.update({
      status: 'returned',
      claimantName: input.claimantName,
      claimantPhone: input.claimantPhone ?? null,
      claimantEmail: input.claimantEmail ?? null,
      claimantCustomerId: input.claimantCustomerId ?? null,
      identifyingDetailsGiven: input.identifyingDetailsGiven,
      idVerified: input.idVerified ?? false,
      returnedAt: FieldValue.serverTimestamp(),
      returnedBy: user.uid,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'LostFoundItemClaimed',
      category: 'Operations',
      module: 'operations',
      resourceType: 'lostFoundItem',
      resourceId: itemRef.id,
      action: 'update',
      user,
      previousValues: { status: item.status },
      newValues: { status: 'returned', claimantName: input.claimantName },
    })

    return successResponse({ itemId: itemRef.id }, 'Item returned to claimant.')
  } catch (error) {
    handleError(error)
  }
})
