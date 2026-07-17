import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CheckSquare,
  ClipboardList,
  GraduationCap,
  Megaphone,
  Receipt,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import {
  DEPARTMENT_WIDGETS_BY_ROLE,
  KPI_CARDS_BY_ROLE,
  MOCK_ACTIVITY_FEED,
  MOCK_ANNOUNCEMENTS,
  MOCK_ASSIGNED_TASKS,
  MOCK_NOTIFICATIONS,
  MOCK_PENDING_APPROVALS,
  QUICK_ACTIONS_BY_ROLE,
  ROLE_PROFILES,
  type DemoRole,
  type KpiColor,
  type KpiIcon,
} from './dashboardDemoData'
import { APPROVAL_STATUS_VARIANT, ROLE_LABELS, TASK_PRIORITY_VARIANT, TASK_STATUS_LABEL, formatDashboardDate } from './dashboardFormat'

const ICONS: Record<KpiIcon, typeof Users> = {
  users: Users,
  userPlus: UserPlus,
  graduationCap: GraduationCap,
  clipboardList: ClipboardList,
  alertTriangle: AlertTriangle,
  wrench: Wrench,
  receipt: Receipt,
  wallet: Wallet,
  megaphone: Megaphone,
  checkSquare: CheckSquare,
  shieldAlert: ShieldAlert,
  activity: Activity,
  building: Building2,
}

const COLOR_CLASSES: Record<KpiColor, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
}

const ROLE_ORDER = Object.keys(ROLE_PROFILES) as DemoRole[]

/**
 * Read-only visual preview of the role-aware Dashboard — dashboard.md §4
 * "Dashboard Layout". Mock data, no Firestore subscriptions, no backend
 * calls. The role switcher is a demo-only control to preview §15
 * "Dashboard by Role" — the real dashboard reads the signed-in user's role.
 */
export function DashboardDemoPage() {
  const [role, setRole] = useState<DemoRole>('hrManager')
  const profile = ROLE_PROFILES[role]
  const kpiCards = KPI_CARDS_BY_ROLE[role]
  const quickActions = QUICK_ACTIONS_BY_ROLE[role]
  const departmentWidget = DEPARTMENT_WIDGETS_BY_ROLE[role]
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-5xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. The real, auth-protected version lives at the app's home route.
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Preview role: {ROLE_LABELS[role]}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            View as
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as DemoRole)}
              className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Welcome Banner — dashboard.md §6 */}
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Good Morning,</p>
            <h2 className="font-display text-2xl text-foreground">{profile.firstName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.position} &middot; {profile.department} &middot; {profile.outlet}
            </p>
          </CardContent>
        </Card>

        {/* KPI Cards — dashboard.md §7 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kpiCards.map((kpi) => {
            const Icon = ICONS[kpi.icon]
            return (
              <Card key={kpi.title}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${COLOR_CLASSES[kpi.color]}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{kpi.title}</p>
                    <p className="text-lg font-semibold text-foreground">{kpi.value}</p>
                  </div>
                  {kpi.trend && (
                    <div className={`flex items-center gap-1 text-xs ${kpi.trend.direction === 'up' ? 'text-success' : 'text-destructive'}`}>
                      {kpi.trend.direction === 'up' ? (
                        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {kpi.trend.label}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions — dashboard.md §8 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            {quickActions.map((action) => {
              const Icon = ICONS[action.icon]
              return (
                <Link key={action.label} to={action.to}>
                  <Button variant="secondary" size="sm">
                    <Icon className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {action.label}
                  </Button>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        {/* Pending Approvals | Assigned Tasks — dashboard.md §9-10 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-0">
              {MOCK_PENDING_APPROVALS.length === 0 ? (
                <EmptyState title="No pending approvals" />
              ) : (
                MOCK_PENDING_APPROVALS.map((approval) => (
                  <div key={approval.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{approval.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {approval.requestor} &middot; {formatDashboardDate(approval.date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={APPROVAL_STATUS_VARIANT[approval.status]}>{approval.status}</Badge>
                      <Button size="sm" variant="ghost" disabled>
                        Review
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned Tasks</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-0">
              {MOCK_ASSIGNED_TASKS.length === 0 ? (
                <EmptyState title="No assigned tasks" />
              ) : (
                MOCK_ASSIGNED_TASKS.map((task) => (
                  <div key={task.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <Badge variant={TASK_PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>Due {formatDashboardDate(task.dueDate)}</span>
                      <span>{TASK_STATUS_LABEL[task.status]}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${task.progress}%` }} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Announcements | Notifications — dashboard.md §11-12 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Announcements</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              {MOCK_ANNOUNCEMENTS.length === 0 ? (
                <EmptyState title="No announcements available" icon={<Megaphone className="h-8 w-8" aria-hidden="true" />} />
              ) : (
                MOCK_ANNOUNCEMENTS.map((announcement) => (
                  <div key={announcement.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium text-foreground">{announcement.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{announcement.summary}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {announcement.author} &middot; {formatDashboardDate(announcement.date)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" aria-hidden="true" />
                Notifications
                {unreadCount > 0 && <Badge variant="info">{unreadCount} new</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-0">
              {MOCK_NOTIFICATIONS.map((notification) => (
                <div key={notification.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                  <p className={`text-sm ${notification.read ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>{notification.message}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{notification.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Department Widgets — dashboard.md §14 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{departmentWidget.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 pt-0 sm:grid-cols-3 lg:grid-cols-5">
            {departmentWidget.items.map((item) => (
              <div key={item.label}>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-base font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activity Feed — dashboard.md §13 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Feed</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            {MOCK_ACTIVITY_FEED.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">{item.user}</span>
                <span className="text-muted-foreground">{item.action}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{item.timestamp}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
