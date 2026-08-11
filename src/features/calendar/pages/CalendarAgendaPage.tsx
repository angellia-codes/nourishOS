import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin, Plus, Users } from 'lucide-react'
import { Badge, Button, Card, CardContent, Spinner } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import { useToast } from '@/hooks'
import * as calendarService from '../calendarService'
import {
  EVENT_PRIORITY_VARIANT,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  SYNC_STATUS_LABELS,
  formatEventDay,
  formatEventTime,
} from '../calendarFormat'
import type { CalendarEvent } from '@/types'

/** Executive Calendar agenda — HR_OPERATIONS.md §9.2-F02 (agenda/list view). */
export function CalendarAgendaPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    return calendarService.subscribeToUpcomingEvents(setEvents)
  }, [])

  async function handleCancel(event: CalendarEvent) {
    setCancellingId(event.id)
    try {
      await calendarService.cancelCalendarEvent(event.id)
      toast.success(`"${event.title}" cancelled — the Google Calendar copy is removed too.`)
    } catch {
      toast.error('Could not cancel this event. Please try again.')
    } finally {
      setCancellingId(null)
    }
  }

  if (events === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const days = groupByDay(events)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Executive Calendar</h1>
          <p className="text-sm text-muted-foreground">Meetings, interviews, reviews and events from today onward.</p>
        </div>
        <PermissionGuard permission={PERMISSIONS.CALENDAR_CREATE}>
          <Button onClick={() => navigate('/calendar/new')}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New Event
          </Button>
        </PermissionGuard>
      </div>

      {days.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" aria-hidden="true" />}
          title="Nothing scheduled"
          description="Upcoming meetings, interviews and reviews will appear here."
        />
      ) : (
        days.map(([dayKey, dayEvents]) => (
          <div key={dayKey} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">{formatEventDay(new Date(dayKey))}</h2>
            {dayEvents.map((event) => {
              const start = new Date(event.startAt)
              const end = new Date(event.endAt)
              const cancelled = event.eventStatus === 'cancelled'

              return (
                <Card key={event.id} className={cancelled ? 'opacity-60' : undefined}>
                  <CardContent className="flex flex-col gap-2 py-4">
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: EVENT_TYPE_COLORS[event.eventType] }}
                        aria-hidden="true"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-medium text-foreground ${cancelled ? 'line-through' : ''}`}>
                            {event.title}
                          </span>
                          <Badge variant={EVENT_PRIORITY_VARIANT[event.priority]}>{event.priority}</Badge>
                          {cancelled && <Badge variant="neutral">Cancelled</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {event.allDay ? 'All day' : `${formatEventTime(start)} – ${formatEventTime(end)}`} ·{' '}
                          {EVENT_TYPE_LABELS[event.eventType]}
                        </p>
                      </div>
                      {!cancelled && (
                        <PermissionGuard permission={PERMISSIONS.CALENDAR_MANAGE}>
                          <Button
                            variant="ghost"
                            onClick={() => handleCancel(event)}
                            disabled={cancellingId === event.id}
                          >
                            {cancellingId === event.id ? <Spinner className="h-4 w-4" /> : 'Cancel'}
                          </Button>
                        </PermissionGuard>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 pl-[22px] text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        {event.participants.length} participant{event.participants.length === 1 ? '' : 's'}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {event.location}
                        </span>
                      )}
                      {event.syncStatus !== 'synced' && <span>{SYNC_STATUS_LABELS[event.syncStatus]}</span>}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}

/** Groups events under a 'YYYY-MM-DD' key; the query already sorts them by start time. */
function groupByDay(events: CalendarEvent[]): [string, CalendarEvent[]][] {
  const byDay = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const start = new Date(event.startAt)
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
    byDay.set(key, [...(byDay.get(key) ?? []), event])
  }
  return [...byDay.entries()]
}
