import { FileEdit, Megaphone, Archive, type LucideIcon } from 'lucide-react'
import type { StatusTone } from '@/components/ui'
import type { Announcement, AnnouncementCategory, AnnouncementStatus, MilestoneType } from '@/types'
import type { NotificationPriority } from '@/constants/statuses'

/** communications.md §5 — Categories. `emergency` is §13's Broadcast. */
export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  operations: 'Operations',
  hr: 'HR',
  finance: 'Finance',
  training: 'Training',
  maintenance: 'Maintenance',
  events: 'Events',
  emergency: 'Emergency',
  general: 'General',
}

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
}

/** STYLE_GUIDE.md § Shared components — StatusPill tone/icon mapping. */
export const ANNOUNCEMENT_STATUS_TONE: Record<AnnouncementStatus, StatusTone> = {
  draft: 'draft',
  published: 'success',
  archived: 'closed',
}

export const ANNOUNCEMENT_STATUS_ICON: Record<AnnouncementStatus, LucideIcon> = {
  draft: FileEdit,
  published: Megaphone,
  archived: Archive,
}

export const PRIORITY_VARIANT: Record<NotificationPriority, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
  informational: 'neutral',
}

/** Auto-generated milestone posts — functions/src/communications/milestoneAnnouncements.ts. */
export const MILESTONE_LABELS: Record<MilestoneType, string> = {
  birthday: 'Birthday',
  anniversary: 'Work Anniversary',
  newHire: 'New Team Member',
  farewell: 'Farewell',
}

export const MILESTONE_EMOJI: Record<MilestoneType, string> = {
  birthday: '🎂',
  anniversary: '🎊',
  newHire: '👋',
  farewell: '🙏',
}

/** Mirrors WISH_EMOJI in functions/src/communications/milestoneAnnouncements.ts — the callable rejects anything else. */
export const WISH_EMOJI = ['🎉', '🎂', '❤️', '👏', '🔥'] as const

export const WISH_MESSAGE_MAX = 280

/**
 * Pinned first, then newest. Sorted here rather than in the query so the feed
 * needs one composite index instead of two — the list is small enough that the
 * server ordering by publishedAt is all the help it needs.
 */
export function sortForFeed(rows: Announcement[]): Announcement[] {
  return [...rows].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt)
  })
}

/** "All outlets · Kitchen · Kitchen Leader" — the author's intent, not the resolved uid list. */
export function describeAudience(
  announcement: Pick<Announcement, 'outletIds' | 'departmentIds' | 'roleIds'>,
  labelFor: (kind: 'outlet' | 'department' | 'role', id: string) => string,
): string {
  const parts = [
    announcement.outletIds.length === 0
      ? 'All outlets'
      : announcement.outletIds.map((id) => labelFor('outlet', id)).join(', '),
    announcement.departmentIds.length === 0
      ? 'all departments'
      : announcement.departmentIds.map((id) => labelFor('department', id)).join(', '),
    announcement.roleIds.length === 0 ? 'all roles' : announcement.roleIds.map((id) => labelFor('role', id)).join(', '),
  ]
  return parts.join(' · ')
}
