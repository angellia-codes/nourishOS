import { AlertTriangle, Clock, Download, Package, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { useToast } from '@/hooks'
import { MOCK_EXECUTIVE_KPIS, MOCK_OUTLET_COMPLIANCE, MOCK_REPORTS, type KpiColor, type KpiIcon } from './reportsDemoData'

const ICONS: Record<KpiIcon, typeof Users> = {
  users: Users,
  wallet: Wallet,
  clipboardList: Clock,
  package: Package,
  trendingUp: TrendingUp,
  alertTriangle: AlertTriangle,
}

const COLOR_CLASSES: Record<KpiColor, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
}

function formatReportDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

/**
 * Read-only visual preview of the Executive Dashboard — reports.md §8
 * "Dashboard System" Executive Dashboard, §6 "Core KPI Categories". Mock
 * data, no Firestore subscriptions, no backend calls. Export is simulated
 * with a toast.
 */
export function ExecutiveDashboardDemoPage() {
  const toast = useToast()

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-5xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. The real, auth-protected version will live at /reports.
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground">Company-wide KPIs aggregated across HR, Finance, Operations, and Inventory.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_EXECUTIVE_KPIS.map((kpi) => {
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

        {/* Operational Dashboard widget — reports.md §8 "Checklist status" */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outlet Checklist Compliance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 pt-0 sm:grid-cols-3">
            {MOCK_OUTLET_COMPLIANCE.map((row) => (
              <div key={row.outlet}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{row.outlet}</span>
                  <span className="text-muted-foreground">{row.compliance}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                  <div
                    className={`h-full rounded-full ${row.compliance < 90 ? 'bg-warning' : 'bg-success'}`}
                    style={{ width: `${row.compliance}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Standard Reports list — reports.md §7 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reports</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-0">
            {MOCK_REPORTS.map((report) => (
              <div key={report.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{report.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Last generated {formatReportDate(report.lastGenerated)} &middot; {report.format}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{report.category}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toast.success(`"${report.name}" exported (demo) — no file was actually generated.`)}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Export
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
