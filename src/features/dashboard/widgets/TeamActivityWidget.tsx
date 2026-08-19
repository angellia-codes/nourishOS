import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { Timeline, TimelineItem } from '@/components/ui'
import { formatRelativeTime } from '@/utils'
import { DashboardWidget } from './DashboardWidget'
import * as activityService from '@/features/communications/activity/activityService'
import type { ActivityFeedEntry } from '@/types'

const MAX_ROWS = 5

/**
 * dashboard.md §15 "Team Activity" — communications.md §10's company-wide
 * feed, top five. No standalone page (removed by request) — this widget is
 * the only surface, presented like the audit-log Timeline embedded on
 * EmployeeProfilePage.tsx (title + relative time, not a clickable row) rather
 * than a browsable list of its own.
 */
export function TeamActivityWidget() {
  const [entries, setEntries] = useState<ActivityFeedEntry[] | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(
    () =>
      activityService.subscribeToActivityFeed(MAX_ROWS, setEntries, () => {
        setDenied(true)
        setEntries([])
      }),
    [],
  )

  return (
    <DashboardWidget
      title="Team Activity"
      icon={Activity}
      count={entries === null ? undefined : entries.length}
      loading={entries === null}
      denied={denied}
      emptyText="No recent activity."
    >
      <Timeline>
        {(entries ?? []).map((entry) => (
          <TimelineItem key={entry.id} title={entry.title} timestamp={formatRelativeTime(entry.createdAt)} />
        ))}
      </Timeline>
    </DashboardWidget>
  )
}
