import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS } from '../../lib'
import { sendNotificationInternal } from '../notifications'

export interface RecordMentionsInternalInput {
  mentionedUids: string[]
  mentionedBy: string
  mentionedByName: string
  sourceModule: 'chat' | 'tasks'
  sourceId: string
  snippet: string
  actionUrl: string
}

/**
 * Communications module — Mentions (communications.md §11). Shared by
 * sendMessage (chat) and addTaskComment (tasks) — both are a free-text body
 * with an optional list of @-mentioned uids picked from the same
 * subscribeToDirectory autocomplete, so both need the identical "log the
 * mention, notify the person" side effect.
 *
 * Mentions route through the Notification Center rather than getting their
 * own inbox page (confirmed scope decision) — the mentions collection is
 * kept as a durable log only, not read by any UI yet.
 *
 * Unknown or inactive uids are silently skipped rather than rejected: the
 * mention list came from a client-side autocomplete against real users, so a
 * stale entry (e.g. the mentioned user was deactivated between typing and
 * sending) shouldn't block the message/comment itself from sending.
 */
export async function recordMentionsInternal(input: RecordMentionsInternalInput): Promise<void> {
  const uniqueUids = [...new Set(input.mentionedUids)].filter((uid) => uid !== input.mentionedBy)
  if (uniqueUids.length === 0) return

  const userSnaps = await Promise.all(uniqueUids.map((uid) => db.collection(COLLECTIONS.USERS).doc(uid).get()))
  const validUids = userSnaps.filter((snap) => snap.exists && snap.data()?.status === 'active').map((snap) => snap.id)

  const snippet = input.snippet.length > 200 ? `${input.snippet.slice(0, 200)}…` : input.snippet

  await Promise.all(
    validUids.map(async (mentionedUid) => {
      await db.collection(COLLECTIONS.MENTIONS).add({
        mentionedUid,
        mentionedBy: input.mentionedBy,
        sourceModule: input.sourceModule,
        sourceId: input.sourceId,
        snippet,
        createdAt: FieldValue.serverTimestamp(),
      })

      await sendNotificationInternal({
        type: 'mention',
        title: 'You were mentioned',
        message: `${input.mentionedByName} mentioned you: "${snippet}"`,
        module: 'communications',
        priority: 'medium',
        recipientUid: mentionedUid,
        senderUid: input.mentionedBy,
        referenceModule: input.sourceModule,
        referenceId: input.sourceId,
        actionUrl: input.actionUrl,
      })
    }),
  )
}
