import { orderBy, where } from 'firebase/firestore'
import { callFunction } from '@/services/api'
import { queryDocuments, subscribeToCollection } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { AppNotification } from '@/types'
import type { Unsubscribe } from 'firebase/firestore'

/**
 * No "sendNotification" export here — per notifications.md §8, notifications
 * originate from Cloud Functions reacting to module events, never directly
 * from the client. This service only covers what the notification bell
 * actually does: read, mark read, mark all read.
 */

export function markNotificationRead(notificationId: string): Promise<void> {
  return callFunction('markNotificationRead', { notificationId })
}

export function markAllNotificationsRead(): Promise<void> {
  return callFunction('markAllNotificationsRead')
}

export function getMyNotifications(uid: string): Promise<AppNotification[]> {
  return queryDocuments<AppNotification>(COLLECTIONS.NOTIFICATIONS, [
    where('recipientUid', '==', uid),
    orderBy('createdAt', 'desc'),
  ])
}

export function subscribeToMyNotifications(
  uid: string,
  onChange: (notifications: AppNotification[]) => void,
): Unsubscribe {
  return subscribeToCollection<AppNotification>(
    COLLECTIONS.NOTIFICATIONS,
    [where('recipientUid', '==', uid), orderBy('createdAt', 'desc')],
    onChange,
  )
}
