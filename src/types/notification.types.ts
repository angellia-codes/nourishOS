import type { Timestamp } from 'firebase/firestore'
import type { BaseDocument } from './firestore.types'
import type { NotificationPriority } from '@/constants/statuses'

/** Source: NOTIFICATIONS.md §9. */
export interface AppNotification extends BaseDocument {
  type: string
  title: string
  message: string
  module: string
  priority: NotificationPriority
  recipientUid: string
  senderUid?: string
  referenceModule?: string
  referenceId?: string
  actionUrl?: string
  isRead: boolean
  readAt?: Timestamp
  expiresAt?: Timestamp
}
