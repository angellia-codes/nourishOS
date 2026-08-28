import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Unsubscribe } from '@/services/firestore'
import type { Announcement, AnnouncementCategory, AnnouncementRead } from '@/types'
import type { NotificationPriority } from '@/constants/statuses'
import type { Role } from '@/constants/roles'

export interface AnnouncementInput {
  title: string
  body: string
  category: AnnouncementCategory
  priority: NotificationPriority
  isPinned: boolean
  /** Empty array means "everyone" on that dimension — see announcement.types.ts. */
  outletIds: string[]
  departmentIds: string[]
  roleIds: Role[]
}

export function createAnnouncement(
  input: AnnouncementInput & { publishNow?: boolean },
): Promise<{ announcementId: string; recipientCount: number }> {
  return callFunction('createAnnouncement', input)
}

export function updateAnnouncement(
  input: AnnouncementInput & { announcementId: string },
): Promise<{ announcementId: string }> {
  return callFunction('updateAnnouncement', input)
}

export function publishAnnouncement(
  announcementId: string,
): Promise<{ announcementId: string; recipientCount: number }> {
  return callFunction('publishAnnouncement', { announcementId })
}

export function archiveAnnouncement(announcementId: string): Promise<{ announcementId: string }> {
  return callFunction('archiveAnnouncement', { announcementId })
}

export function recordAnnouncementRead(announcementId: string): Promise<{ announcementId: string }> {
  return callFunction('recordAnnouncementRead', { announcementId })
}

export function getAnnouncement(announcementId: string): Promise<Announcement | null> {
  return getDocument<Announcement>(COLLECTIONS.ANNOUNCEMENTS, announcementId)
}

/**
 * The reader's feed. `array-contains` on the server-resolved audience is the
 * only constraint firestore.rules can also express, so it is deliberately the
 * only one here — filtering by category or pinning happens client-side.
 * Backed by the announcements audienceUids+publishedAt index.
 */
export function subscribeToMyFeed(
  uid: string,
  onChange: (rows: Announcement[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<Announcement>(
    COLLECTIONS.ANNOUNCEMENTS,
    [where('audienceUids', 'array-contains', uid), orderBy('publishedAt', 'desc')],
    onChange,
    onError,
  )
}

/**
 * The author's own announcements, drafts included. Elevated readers pass no uid
 * and get every announcement — both variants match a branch of the read rule,
 * which is what keeps the query from failing wholesale on one unreadable row.
 */
export function subscribeToManagedAnnouncements(
  uid: string | null,
  onChange: (rows: Announcement[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<Announcement>(
    COLLECTIONS.ANNOUNCEMENTS,
    uid ? [where('createdBy', '==', uid), orderBy('createdAt', 'desc')] : [orderBy('createdAt', 'desc')],
    onChange,
    onError,
  )
}

export function sendMilestoneWish(input: {
  announcementId: string
  emoji: string
  message?: string
}): Promise<{ announcementId: string }> {
  return callFunction('sendMilestoneWish', input)
}

/** One query for the whole unread state, rather than a read-receipt lookup per row. */
export function subscribeToMyReads(
  uid: string,
  onChange: (rows: AnnouncementRead[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<AnnouncementRead>(
    COLLECTIONS.ANNOUNCEMENT_READS,
    [where('uid', '==', uid)],
    onChange,
    onError,
  )
}
