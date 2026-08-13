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

const DISPOSAL_METHODS = ['donated', 'discarded', 'handedToAuthorities'] as const
type DisposalMethod = (typeof DISPOSAL_METHODS)[number]

interface DisposeLostFoundItemInput {
  itemId: string
  disposalMethod: DisposalMethod
  disposalNotes: string
  /** Required to dispose before retentionExpiresAt — must carry a reason via disposalNotes. */
  overrideBeforeRetention?: boolean
}

/** lost-and-found-report.md §7/§10 AC-5 — blocks disposal before retentionExpiresAt without an explicit manager override + reason. */
export const disposeLostFoundItem = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.LOST_FOUND_MANAGE)

    const input = (request.data ?? {}) as Partial<DisposeLostFoundItemInput>

    if (!input.itemId || !input.disposalMethod || !DISPOSAL_METHODS.includes(input.disposalMethod) || !input.disposalNotes) {
      throw new AppError('invalid-argument', 'itemId, disposalMethod, and disposalNotes are required.')
    }

    const itemRef = db.collection(COLLECTIONS.LOST_FOUND_ITEMS).doc(input.itemId)
    const itemSnap = await itemRef.get()
    if (!itemSnap.exists) {
      throw new AppError('not-found', 'Lost & found item not found.')
    }
    const item = itemSnap.data()!

    if (item.status === 'returned' || item.status === 'disposed' || item.status === 'donated') {
      throw new AppError('failed-precondition', `Item is already ${item.status}.`)
    }

    const today = new Date().toISOString().slice(0, 10)
    if (item.retentionExpiresAt > today && !input.overrideBeforeRetention) {
      throw new AppError(
        'failed-precondition',
        `Retention holds until ${item.retentionExpiresAt}. Pass overrideBeforeRetention with a reason in disposalNotes to dispose early.`,
      )
    }

    const status = input.disposalMethod === 'donated' ? 'donated' : 'disposed'

    await itemRef.update({
      status,
      disposalMethod: input.disposalMethod,
      disposalNotes: input.disposalNotes,
      disposedAt: FieldValue.serverTimestamp(),
      disposedBy: user.uid,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'LostFoundItemDisposed',
      category: 'Operations',
      module: 'operations',
      resourceType: 'lostFoundItem',
      resourceId: itemRef.id,
      action: 'update',
      user,
      previousValues: { status: item.status },
      newValues: { status, disposalMethod: input.disposalMethod },
    })

    return successResponse({ itemId: itemRef.id }, 'Item disposed.')
  } catch (error) {
    handleError(error)
  }
})
