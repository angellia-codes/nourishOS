import type { ComponentType } from 'react'
import { useAuth } from '@/hooks'
import { DEPARTMENTS, OUTLETS, ROLE_LABELS } from '@/constants'
import { formatDate } from '@/utils'
import { PendingApprovalsWidget } from './widgets/PendingApprovalsWidget'
import { AssignedTasksWidget } from './widgets/AssignedTasksWidget'
import { AnnouncementsWidget } from './widgets/AnnouncementsWidget'
import { UpcomingCalendarWidget } from './widgets/UpcomingCalendarWidget'
import { TeamActivityWidget } from './widgets/TeamActivityWidget'
import { RecentlyCompletedTasksWidget } from './widgets/RecentlyCompletedTasksWidget'
import { OpenPositionsWidget } from './widgets/OpenPositionsWidget'
import { ContractRenewalsDueWidget } from './widgets/ContractRenewalsDueWidget'
import { InterviewsTodayWidget } from './widgets/InterviewsTodayWidget'
import { EscalationCenterWidget } from './widgets/EscalationCenterWidget'
import { ActiveProjectsWidget } from './widgets/ActiveProjectsWidget'
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
 * HR_OPERATIONS.md §9.9/§9.13 — the widget set varies by role rather than
 * every role seeing the same seven cards. The four common widgets (approvals,
 * own tasks, announcements, calendar) stay for everyone because they are about
 * the viewer's own work; what changes is the operational set layered on top.
 *
 * Deliberately not the doc's full 11-per-role tables: several rows there
 * (Recruitment Funnel chart, Review Completion Rate) already have their own
 * report pages, and duplicating them as widgets would mean a second
 * aggregation of the same data. Roles not listed fall back to DEFAULT_EXTRAS.
 */
const ROLE_WIDGETS: Record<string, ComponentType[]> = {
  hrManager: [ContractRenewalsDueWidget, InterviewsTodayWidget, OpenPositionsWidget, EscalationCenterWidget],
  generalManager: [EscalationCenterWidget, ActiveProjectsWidget, OpenPositionsWidget, InterviewsTodayWidget],
  director: [EscalationCenterWidget, ActiveProjectsWidget],
  superAdmin: [
    ContractRenewalsDueWidget,
    InterviewsTodayWidget,
    OpenPositionsWidget,
    EscalationCenterWidget,
    ActiveProjectsWidget,
  ],
}

/** Outlet leaders and everyone else: their own team's activity, not company-wide rollups. */
const DEFAULT_EXTRAS: ComponentType[] = [TeamActivityWidget, RecentlyCompletedTasksWidget]

/**
 * The landing page — dashboard.md §4. Seven widgets: §9 approvals, §10 tasks,
 * §12 announcements, the Upcoming Calendar widget (closing the §26 "Company
 * calendar" wishlist item with the calendar module's existing
 * subscribeToUpcomingEvents), two added alongside communications.md's
 * Activity Feed (§10/§15 Team Activity, §15 Recently Completed Tasks), and
 * Open Positions (employee-requisition.md §9, previously unbuilt). KPI
 * cards (§7) and quick actions (§8) landed separately; the per-department and
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
  const extras = (profile && ROLE_WIDGETS[profile.roleId]) ?? DEFAULT_EXTRAS

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
        {extras.map((Widget, index) => (
          <Widget key={index} />
        ))}
      </div>
    </div>
  )
}
