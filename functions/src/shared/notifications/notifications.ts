import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS, REGION, requireActiveUser, AppError, handleError, successResponse } from '../../lib'

export interface SendNotificationInternalInput {
  type: string
  title: string
  message: string
  module: string
  priority: 'critical' | 'high' | 'medium' | 'low' | 'informational'
  recipientUid: string
  senderUid?: string
  referenceModule?: string
  referenceId?: string
  actionUrl?: string
}

/** Internal only — not a callable. Every other Cloud Function calls this to notify a user. */
export async function sendNotificationInternal(input: SendNotificationInternalInput): Promise<void> {
  await db.collection(COLLECTIONS.NOTIFICATIONS).add({
    type: input.type,
    title: input.title,
    message: input.message,
    module: input.module,
    priority: input.priority,
    recipientUid: input.recipientUid,
    senderUid: input.senderUid ?? null,
    referenceModule: input.referenceModule ?? null,
    referenceId: input.referenceId ?? null,
    actionUrl: input.actionUrl ?? null,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
  })
}

export const markNotificationRead = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    const { notificationId } = (request.data ?? {}) as { notificationId?: string }

    if (!notificationId) {
      throw new AppError('invalid-argument', 'notificationId is required.')
    }

    const ref = db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Notification not found.')
    }
    if (snap.data()!.recipientUid !== user.uid) {
      throw new AppError('permission-denied', 'This notification does not belong to you.')
    }

    await ref.update({ isRead: true, readAt: FieldValue.serverTimestamp() })
    return successResponse(undefined, 'Marked as read.')
  } catch (error) {
    handleError(error)
  }
})

export const markAllNotificationsRead = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)

    const unreadSnap = await db
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where('recipientUid', '==', user.uid)
      .where('isRead', '==', false)
      .get()

    const batch = db.batch()
    unreadSnap.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { isRead: true, readAt: FieldValue.serverTimestamp() })
    })
    await batch.commit()

    return successResponse({ count: unreadSnap.size }, 'All notifications marked as read.')
  } catch (error) {
    handleError(error)
  }
})
