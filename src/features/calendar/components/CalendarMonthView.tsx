import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui'
import * as calendarService from '../calendarService'
import { EVENT_TYPE_COLORS } from '../calendarFormat'
import type { CalendarEvent } from '@/types'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_CHIPS_PER_DAY = 3

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 7-column week grid for one month, with prev/next navigation — HR_OPERATIONS.md §9.2-F01. */
export function CalendarMonthView() {
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()))
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)

  useEffect(() => {
    const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
    return calendarService.subscribeToEventsInRange(monthStart, nextMonthStart, setEvents)
  }, [monthStart])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events ?? []) {
      const key = dateKey(new Date(event.startAt))
      map.set(key, [...(map.get(key) ?? []), event])
    }
    return map
  }, [events])

  const weeks = useMemo(() => {
    const firstOfMonth = monthStart
    const gridStart = new Date(firstOfMonth)
    gridStart.setDate(gridStart.getDate() - gridStart.getDay())

    const days: Date[] = []
    const cursor = new Date(gridStart)
    while (days.length < 42) {
      days.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }

    const result: Date[][] = []
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7))
    return result
  }, [monthStart])

  const today = dateKey(new Date())

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setMonthStart((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <p className="text-sm font-medium text-foreground">
          {new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(monthStart)}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setMonthStart((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-border bg-border text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bg-sunken px-1.5 py-1 text-center font-medium text-muted-foreground">
            {label}
          </div>
        ))}
        {weeks.map((week) =>
          week.map((day) => {
            const key = dateKey(day)
            const inMonth = day.getMonth() === monthStart.getMonth()
            const dayEvents = eventsByDay.get(key) ?? []
            return (
              <div
                key={key}
                className={`flex min-h-[72px] flex-col gap-0.5 bg-surface p-1 ${inMonth ? '' : 'opacity-40'}`}
              >
                <span className={`text-[11px] ${key === today ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                  {day.getDate()}
                </span>
                {dayEvents.slice(0, MAX_CHIPS_PER_DAY).map((event) => (
                  <span
                    key={event.id}
                    className="truncate rounded-sm px-1 py-0.5 text-[10px] text-white"
                    style={{ backgroundColor: EVENT_TYPE_COLORS[event.eventType] }}
                    title={event.title}
                  >
                    {event.title}
                  </span>
                ))}
                {dayEvents.length > MAX_CHIPS_PER_DAY && (
                  <span className="text-[10px] text-muted-foreground">+{dayEvents.length - MAX_CHIPS_PER_DAY} more</span>
                )}
              </div>
            )
          }),
        )}
      </div>
    </div>
  )
}
