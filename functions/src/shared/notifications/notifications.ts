import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS, REGION, requireActiveUser, AppError, handleError, successResponse } from '../../lib'
import { sendWhatsApp, whatsAppTargetForUid } from './whatsapp'

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
  /**
   * Also deliver over WhatsApp (HR_OPERATIONS.md §9.11). Off by default so
   * every existing call site keeps its in-app-only behaviour; opt in per
   * trigger. The calling function must declare `secrets: [FONNTE_TOKEN]`.
   */
  whatsapp?: boolean
  /** Overrides the recipient's own number — used when the audience isn't a system user (a candidate). */
  whatsappTarget?: string
}

/** Internal only — not a callable. Every other Cloud Function calls this to notify a user. */
export async function sendNotificationInternal(input: SendNotificationInternalInput): Promise<void> {
  // The in-app doc is written first and never rolled back: it is the durable
  // record, and WhatsApp is a best-effort second channel layered on top of it
  // (§13.1's delivery-status block is what records whether that leg landed).
  const ref = await db.collection(COLLECTIONS.NOTIFICATIONS).add({
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

  if (!input.whatsapp) return

  const target = input.whatsappTarget ?? (await whatsAppTargetForUid(input.recipientUid))
  if (!target) return

  const result = await sendWhatsApp(target, `*${input.title}*\n\n${input.message}`)
  await ref.update({
    whatsappStatus: result.status,
    whatsappMessageId: result.messageId,
    whatsappAttempts: result.attempts,
    whatsappError: result.error,
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

    // deploy-checklist.md B4: a plain db.batch() throws past 500 writes.
    // bulkWriter has no such limit — it chunks and retries on its own.
    const writer = db.bulkWriter()
    unreadSnap.docs.forEach((docSnap) => {
      writer.update(docSnap.ref, { isRead: true, readAt: FieldValue.serverTimestamp() })
    })
    await writer.close()

    return successResponse({ count: unreadSnap.size }, 'All notifications marked as read.')
  } catch (error) {
    handleError(error)
  }
})
