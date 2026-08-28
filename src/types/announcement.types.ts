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

  /**
   * Set only by the milestoneAnnouncements scheduled job — never accepted from
   * a client. Its presence is what turns the detail page into a celebration
   * card and opens the post for wishes.
   */
  milestoneType?: MilestoneType | null
  milestoneEmployeeId?: string | null
  /** Denormalised count of announcementWishes, so the feed row needs no second query. */
  wishCount?: number
}

/** functions/src/communications/milestoneMatch.ts — the four auto-generated employee milestones. */
export type MilestoneType = 'birthday' | 'anniversary' | 'newHire' | 'farewell'

/**
 * One per (milestone announcement, person). Doc id is
 * `${announcementId}_${uid}`, so a person holds one wish — tapping a different
 * emoji or adding a message updates it in place rather than stacking.
 */
export interface MilestoneWish {
  id: string
  announcementId: string
  uid: string
  senderName: string
  emoji: string
  message: string
  createdAt: string
  updatedAt: string
}

/** One per (announcement, reader). Doc id is `${announcementId}_${uid}`, so recording a read twice is idempotent. */
export interface AnnouncementRead {
  id: string
  announcementId: string
  uid: string
  readAt: string
}
