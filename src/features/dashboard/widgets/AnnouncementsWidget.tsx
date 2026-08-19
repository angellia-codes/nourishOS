import { useEffect, useMemo, useState } from 'react'
import { Megaphone, Pin } from 'lucide-react'
import { useAuth } from '@/hooks'
import { formatRelativeTime } from '@/utils'
import { DashboardWidget, WidgetRow } from './DashboardWidget'
import * as announcementService from '@/features/communications/announcements/announcementService'
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  sortForFeed,
} from '@/features/communications/announcements/announcementFormat'
import type { Announcement } from '@/types'

const MAX_ROWS = 5

/**
 * dashboard.md §12. The same feed the Announcements page shows — pinned first,
 * then newest (sortForFeed) — with unread marked from the reader's own receipts.
 * Opening a row is what records the read, so this widget never writes.
 */
export function AnnouncementsWidget() {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [rows, setRows] = useState<Announcement[] | null>(null)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!uid) return
    return announcementService.subscribeToMyFeed(uid, setRows, () => {
      setDenied(true)
      setRows([])
    })
  }, [uid])

  useEffect(() => {
    if (!uid) return
    return announcementService.subscribeToMyReads(
      uid,
      (reads) => setReadIds(new Set(reads.map((read) => read.announcementId))),
      () => setReadIds(new Set()),
    )
  }, [uid])

  // Unread first within the pinned/newest order — the widget shows five, and an
  // unread notice is worth more of that space than a read one.
  const ordered = useMemo(() => {
    const sorted = sortForFeed(rows ?? [])
    const unread = sorted.filter((row) => !readIds.has(row.id))
    const read = sorted.filter((row) => readIds.has(row.id))
    return [...unread, ...read]
  }, [rows, readIds])

  const unreadCount = (rows ?? []).filter((row) => !readIds.has(row.id)).length

  return (
    <DashboardWidget
      title="Announcements"
      icon={Megaphone}
      count={rows === null ? undefined : rows.length}
      viewAllTo="/communications/announcements"
      loading={rows === null}
      denied={denied}
      emptyText="No announcements available."
      className="lg:col-span-2"
    >
      <div className="flex flex-col gap-2">
        {unreadCount > 0 && (
          <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
        )}
        {ordered.slice(0, MAX_ROWS).map((row) => {
          const unread = !readIds.has(row.id)
          return (
            <WidgetRow key={row.id} to={`/communications/announcements/${row.id}`}>
              <div className="flex min-w-0 items-center gap-2">
                {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                {row.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Pinned" />}
                <div className="min-w-0">
                  <p className={unread ? 'truncate text-sm font-semibold text-foreground' : 'truncate text-sm text-foreground'}>
                    {row.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ANNOUNCEMENT_CATEGORY_LABELS[row.category]} ·{' '}
                    {formatRelativeTime(row.publishedAt ?? row.createdAt)}
                  </p>
                </div>
              </div>
            </WidgetRow>
          )
        })}
      </div>
    </DashboardWidget>
  )
}
