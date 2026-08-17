import { onCall } from 'firebase-functions/v2/https'
import { db, COLLECTIONS, REGION, requireActiveUser, recordAuditEvent, updatedFields, AppError, handleError, successResponse } from '../lib'

/**
 * Communication Settings — communications.md §14. Self-service, one doc per
 * user keyed by uid, no requirePermission — a user manages only their own
 * settings, same shape as markNotificationRead's ownership check but on a
 * doc the caller always owns by construction.
 *
 * v1 enforcement is UI-only: mutedChannelIds dims/hides channels in the
 * Team Chat channel list client-side. There is no server-side notification
 * suppression yet — that's future work, matching how §14's email/push/
 * WhatsApp delivery channels are themselves marked Future in the spec.
 */
export const updateCommunicationSettings = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)

    const data = (request.data ?? {}) as {
      mutedChannelIds?: unknown
      notifyOnMention?: unknown
      notifyOnTaskAssigned?: unknown
      notifyOnAnnouncement?: unknown
    }

    const mutedChannelIds = data.mutedChannelIds
    if (mutedChannelIds !== undefined && (!Array.isArray(mutedChannelIds) || mutedChannelIds.some((id) => typeof id !== 'string'))) {
      throw new AppError('invalid-argument', 'mutedChannelIds must be an array of channel ids.')
    }

    const booleans: Record<string, unknown> = {
      notifyOnMention: data.notifyOnMention,
      notifyOnTaskAssigned: data.notifyOnTaskAssigned,
      notifyOnAnnouncement: data.notifyOnAnnouncement,
    }
    for (const [key, value] of Object.entries(booleans)) {
      if (value !== undefined && typeof value !== 'boolean') {
        throw new AppError('invalid-argument', `${key} must be a boolean.`)
      }
    }

    const update: Record<string, unknown> = { ...updatedFields(user.uid) }
    if (mutedChannelIds !== undefined) update.mutedChannelIds = [...new Set(mutedChannelIds as string[])]
    if (data.notifyOnMention !== undefined) update.notifyOnMention = data.notifyOnMention
    if (data.notifyOnTaskAssigned !== undefined) update.notifyOnTaskAssigned = data.notifyOnTaskAssigned
    if (data.notifyOnAnnouncement !== undefined) update.notifyOnAnnouncement = data.notifyOnAnnouncement

    await db.collection(COLLECTIONS.COMMUNICATION_SETTINGS).doc(user.uid).set(update, { merge: true })

    await recordAuditEvent({
      eventType: 'CommunicationSettingsUpdated',
      category: 'Communications',
      module: 'communications',
      resourceType: 'communicationSettings',
      resourceId: user.uid,
      action: 'update',
      user,
      newValues: update,
    })

    return successResponse(undefined, 'Settings saved.')
  } catch (error) {
    return handleError(error)
  }
})
