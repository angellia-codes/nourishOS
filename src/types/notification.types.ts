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
  readAt?: string
  expiresAt?: string

  /**
   * WhatsApp delivery status — HR_OPERATIONS.md §13.1's "delivery-status
   * block". Only present on notifications that opted into the channel
   * (`whatsapp: true` server-side); absent means in-app only, not failed.
   * 'skipped' = no token configured, or the recipient has no linked phone.
   */
  whatsappStatus?: 'sent' | 'failed' | 'skipped'
  whatsappMessageId?: string | null
  whatsappAttempts?: number
  whatsappError?: string | null
}
