import { useEffect, useMemo, useState } from 'react'
import { UserSearch } from 'lucide-react'
import { formatDateTime } from '@/utils'
import * as calendarService from '@/features/calendar/calendarService'
import { DashboardWidget, WidgetRow } from './DashboardWidget'
import type { CalendarEvent } from '@/types'

const MAX_ROWS = 5

/**
 * HR_OPERATIONS.md §9.9 — "Interviews Today" on the HR dashboard and
 * "Upcoming Interviews (7d)" on the GM's. One widget covering both windows:
 * today first, then the rest of the week, because an empty "today" list with a
 * full week behind it is the case the GM actually wants to see.
 *
 * Reads calendarEvents rather than `interviews` — scheduleInterview writes both,
 * and the calendar range subscription already exists (no new index).
 */
export function InterviewsTodayWidget() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)

  useEffect(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    return calendarService.subscribeToEventsInRange(start, end, setEvents)
  }, [])

  const interviews = useMemo(
    () =>
      (events ?? [])
        .filter((event) => event.eventType === 'recruitmentInterview' && event.eventStatus !== 'cancelled')
        .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [events],
  )

  const todayKey = new Date().toISOString().slice(0, 10)
  const todayCount = interviews.filter((event) => event.startAt.slice(0, 10) === todayKey).length

  return (
    <DashboardWidget
      title="Interviews (7 days)"
      icon={UserSearch}
      count={events === null ? undefined : interviews.length}
      viewAllTo="/calendar"
      loading={events === null}
      emptyText="No interviews scheduled this week."
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          {todayCount === 0 ? 'None today' : `${todayCount} today`}
        </p>
        {interviews.slice(0, MAX_ROWS).map((event) => (
          <WidgetRow key={event.id} to="/calendar">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(event.startAt)}
                {event.location ? ` · ${event.location}` : ''}
              </p>
            </div>
          </WidgetRow>
        ))}
      </div>
    </DashboardWidget>
  )
}
