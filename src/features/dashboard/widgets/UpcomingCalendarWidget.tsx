import { useEffect, useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import * as calendarService from '@/features/calendar/calendarService'
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS, formatEventDay, formatEventTime } from '@/features/calendar/calendarFormat'
import { DashboardWidget, WidgetRow } from './DashboardWidget'
import type { CalendarEvent } from '@/types'

const MAX_ROWS = 5

/**
 * dashboard.md §26 wishlist item, closed with what already exists —
 * subscribeToUpcomingEvents already returns exactly this (today-forward,
 * ordered), rules-scoped per viewer the same way /calendar is. No onError
 * channel here: that service function only takes onChange, so there is no
 * denied state to surface (unlike the other three widgets' services).
 */
export function UpcomingCalendarWidget() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)

  useEffect(() => {
    return calendarService.subscribeToUpcomingEvents(setEvents)
  }, [])

  const confirmed = useMemo(() => (events ?? []).filter((event) => event.eventStatus === 'confirmed'), [events])

  return (
    <DashboardWidget
      title="Upcoming Calendar"
      icon={CalendarDays}
      count={events === null ? undefined : confirmed.length}
      viewAllTo="/calendar"
      loading={events === null}
      emptyText="No upcoming events."
      className="lg:col-span-2"
    >
      <div className="flex flex-col gap-2">
        {confirmed.slice(0, MAX_ROWS).map((event) => {
          const start = new Date(event.startAt)
          const end = new Date(event.endAt)
          return (
            <WidgetRow key={event.id}>
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: EVENT_TYPE_COLORS[event.eventType] }}
                  aria-hidden="true"
                />
                <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                {formatEventDay(start)} · {event.allDay ? 'All day' : `${formatEventTime(start)}–${formatEventTime(end)}`}
                {' · '}
                {EVENT_TYPE_LABELS[event.eventType]}
              </p>
            </WidgetRow>
          )
        })}
      </div>
    </DashboardWidget>
  )
}
