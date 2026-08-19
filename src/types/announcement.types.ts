import type { BaseDocument } from './firestore.types'
import type { NotificationPriority } from '@/constants/statuses'
import type { Role } from '@/constants/roles'

/** communications.md §5 — Categories. `emergency` is what §13 calls a Broadcast. */
export type AnnouncementCategory =
  | 'operations'
  | 'hr'
  | 'finance'
  | 'training'
  | 'maintenance'
  | 'events'
  | 'emergency'
  | 'general'

/** communications.md §5 workflow, minus the optional Review step (see functions/src/communications/announcements.ts). */
export type AnnouncementStatus = 'draft' | 'published' | 'archived'

/**
 * communications.md §5. Two things worth knowing about this shape:
 *
 * - `body` is plain text, rendered whitespace-pre-wrap. §5 asks for a rich text
 *   editor; that needs a dependency and server-side sanitisation before it can
 *   render, and it is deferred.
 * - `audienceUids` is the outlet/department/role targeting resolved to concrete
 *   uids at publish time. It is what firestore.rules and the feed query both
 *   read — see the rules block for why the intent arrays alone can't work.
 *
 * Attachments are not stored inline: they are `files` documents queried by
 * resourceType 'announcement' / resourceId, the same convention Employee,
 * Appraisal and Lost & Found follow.
 */
export interface Announcement extends BaseDocument {
  title: string
  body: string
  category: AnnouncementCategory
  /** Drives the priority of the notification the announcement sends. */
  priority: NotificationPriority
  announcementStatus: AnnouncementStatus
  isPinned: boolean

  /** Empty array means "every outlet" — likewise for the two below. */
  outletIds: string[]
  departmentIds: string[]
  roleIds: Role[]

  /** Server-resolved at publish, cleared at archive. Never sent by the client. */
  audienceUids: string[]
  publishedAt?: string | null
  publishedBy?: string | null
}

/** One per (announcement, reader). Doc id is `${announcementId}_${uid}`, so recording a read twice is idempotent. */
export interface AnnouncementRead {
  id: string
  announcementId: string
  uid: string
  readAt: string
}
