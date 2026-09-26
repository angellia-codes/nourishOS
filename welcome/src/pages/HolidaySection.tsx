import { useState } from 'react'
import { Button, Card, ChevronIcon, Notice, SegmentedToggle } from '../ui'
import { PUBLIC_HOLIDAYS, type PublicHoliday } from '../content/holidays'
import { STRINGS, t, type Lang } from '../strings'

/**
 * Public Holiday 2026 (§7.4, added 2026-09-26) — a month-grid calendar with a
 * Hindu / Non-Hindu toggle, modelled on the main app's
 * `src/features/calendar/components/CalendarMonthView.tsx` (native `Date`
 * math, Sunday-start 6×7 grid, no calendar library — none exists anywhere in
 * this repo). Takes no `content` prop — static bundled data
 * (`content/holidays.ts`), same call Company Profile/Core Values/Grooming
 * already make, not Firestore-backed.
 *
 * §9's rule ("status never conveyed by colour alone") is why a holiday day
 * carries an `aria-label` naming it, not just an amber dot, and why the
 * dot always has a text list of the same month's holidays underneath it.
 */

function parseISO(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const YEAR = PUBLIC_HOLIDAYS.year

export function HolidaySection({ lang }: { lang: Lang }) {
  const [list, setList] = useState<'hindu' | 'nonHindu'>('hindu')
  const today = new Date()
  const [monthIndex, setMonthIndex] = useState(today.getFullYear() === YEAR ? today.getMonth() : 0)

  const activeList: PublicHoliday[] = list === 'hindu' ? PUBLIC_HOLIDAYS.hindu : PUBLIC_HOLIDAYS.nonHindu
  const holidayByDate = new Map(activeList.map((h) => [h.date, h.name]))
  const monthHolidays = activeList
    .filter((h) => parseISO(h.date).getMonth() === monthIndex)
    .sort((a, b) => a.date.localeCompare(b.date))

  const monthStart = new Date(YEAR, monthIndex, 1)
  const gridStart = new Date(monthStart)
  gridStart.setDate(gridStart.getDate() - gridStart.getDay())
  const days: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })

  const locale = lang === 'id' ? 'id-ID' : 'en-GB'
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(monthStart)
  const weekdayLabels = days.slice(0, 7).map((d) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d))
  const dayLabelFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="flex flex-col gap-3">
      <Card index={0}>
        <SegmentedToggle
          value={list}
          onChange={setList}
          ariaLabel={t(STRINGS.secPublicHoliday, lang)}
          options={[
            { value: 'hindu', label: t(STRINGS.holidayHindu, lang) },
            { value: 'nonHindu', label: t(STRINGS.holidayNonHindu, lang) },
          ]}
        />
      </Card>

      <Card index={1}>
        <div className="mb-3 flex items-center justify-between">
          <Button
            variant="ghost"
            className="px-3"
            disabled={monthIndex === 0}
            onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
            aria-label="Previous month"
          >
            <span className="rotate-90">{ChevronIcon}</span>
          </Button>
          <p className="text-sm font-semibold">{monthLabel}</p>
          <Button
            variant="ghost"
            className="px-3"
            disabled={monthIndex === 11}
            onClick={() => setMonthIndex((i) => Math.min(11, i + 1))}
            aria-label="Next month"
          >
            <span className="-rotate-90">{ChevronIcon}</span>
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-center">
          {weekdayLabels.map((label, i) => (
            <span key={i} className="text-xs uppercase text-[var(--w-cream-faint)]">
              {label}
            </span>
          ))}
          {days.map((d) => {
            const inMonth = d.getMonth() === monthIndex
            const holidayName = holidayByDate.get(dateKey(d))
            const isToday = isSameDay(d, today)
            return (
              <div
                key={dateKey(d)}
                aria-label={holidayName ? `${d.getDate()} — ${holidayName}` : undefined}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-sm ${
                  inMonth ? 'text-[var(--w-cream)]' : 'text-[var(--w-cream-faint)] opacity-40'
                } ${isToday ? 'ring-1 ring-[var(--w-amber)]' : ''}`}
              >
                <span className={isToday ? 'font-semibold text-[var(--w-amber)]' : ''}>{d.getDate()}</span>
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${holidayName ? 'bg-[var(--w-amber)]' : 'bg-transparent'}`}
                />
              </div>
            )
          })}
        </div>
      </Card>

      <Card index={2}>
        <h2 className="mb-2 font-semibold">{t(STRINGS.holidayThisMonth, lang)}</h2>
        {monthHolidays.length === 0 ? (
          <Notice>{t(STRINGS.holidayNoneThisMonth, lang)}</Notice>
        ) : (
          <ul className="flex flex-col divide-y divide-white/10">
            {monthHolidays.map((h) => (
              <li key={h.date} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                <span className="text-[var(--w-cream)]">{h.name}</span>
                <span className="w-mono flex-none text-xs text-[var(--w-cream-soft)]">
                  {dayLabelFmt.format(parseISO(h.date))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
