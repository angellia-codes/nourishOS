import { useAuth } from '@/hooks'
import { DEPARTMENTS, OUTLETS, ROLE_LABELS } from '@/constants'
import { formatDate } from '@/utils'
import { PendingApprovalsWidget } from './widgets/PendingApprovalsWidget'
import { AssignedTasksWidget } from './widgets/AssignedTasksWidget'
import { AnnouncementsWidget } from './widgets/AnnouncementsWidget'
import { UpcomingCalendarWidget } from './widgets/UpcomingCalendarWidget'
import { KpiCardsRow } from './widgets/KpiCardsRow'

const OUTLET_NAMES: Record<string, string> = Object.fromEntries(OUTLETS.map((o) => [o.id, o.name]))
const DEPARTMENT_NAMES: Record<string, string> = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d.name]))

/** dashboard.md §6 — greeting by local time, not by the backend's WITA day key. */
function greeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/**
 * The landing page — dashboard.md §4, cut to the four widgets that have data
 * behind them today (§9 approvals, §10 tasks, §12 announcements, and the
 * Upcoming Calendar widget closing the §26 "Company calendar" wishlist item
 * with the calendar module's existing subscribeToUpcomingEvents). KPI cards
 * (§7), quick actions (§8), the activity feed (§13) and the per-department and
 * per-role variants (§14/§15) are not built; §11's notifications widget is
 * deliberately absent because the header bell already is one.
 *
 * Every widget subscribes on its own and renders its own skeleton, so a slow
 * one never blocks the page (§21). There is no manual refresh (§18) — these are
 * live listeners, so there is nothing to refresh.
 *
 * KPI Cards (§7) landed after the fact, reusing the four widgets' own data
 * wherever possible — see KpiCardsRow.
 */
export function DashboardPage() {
  const { profile } = useAuth()
  const firstName = profile?.displayName?.split(' ')[0] ?? 'there'

  const meta = profile
    ? [
        ROLE_LABELS[profile.roleId] ?? profile.roleId,
        DEPARTMENT_NAMES[profile.departmentId] ?? profile.departmentId,
        OUTLET_NAMES[profile.outletId] ?? profile.outletId,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          {greeting(new Date().getHours())}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">{meta}</p>
        <p className="text-xs text-muted-foreground">{formatDate(new Date())}</p>
      </div>

      <KpiCardsRow />

      <div className="grid gap-4 lg:grid-cols-2">
        <PendingApprovalsWidget />
        <AssignedTasksWidget />
        <AnnouncementsWidget />
        <UpcomingCalendarWidget />
      </div>
    </div>
  )
}
