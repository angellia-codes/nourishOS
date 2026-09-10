import { useEffect, useMemo, useState } from 'react'
import {
  Users,
  User,
  UserRound,
  UserPlus,
  UserMinus,
  Building2,
  CalendarCheck,
  GraduationCap,
  TrendingUp,
  Filter,
  Lock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Select, Spinner } from '@/components/ui'
import { BarDiagram, DonutChart, EmptyState, MetricTile, TrendLine } from '@/components/shared'
import { OUTLETS } from '@/constants'
import { formatCompactCurrency } from '@/utils'
import * as employeeService from '@/features/hr/services/employeeService'
import * as attendanceService from '@/features/hr/attendance/attendanceService'
import * as trainingService from '@/features/hr/training/trainingService'
import * as payrollService from '@/features/hr/payroll/payrollService'
import * as revenueService from '@/features/hr/payroll/revenueService'
import { buildAttendanceReportRows } from '@/features/hr/reports/utils/attendance'
import { buildCostRevenueTrend } from '@/features/hr/reports/utils/manningBudget'
import {
  ageBands,
  buildWorkforceSummary,
  departmentSlices,
  disciplinarySlices,
  employmentTypeSlices,
  genderSlices,
  headcountTrend,
  outletSlices,
} from '@/features/hr/reports/utils/workforceOverview'
import type {
  AttendancePeriod,
  AttendanceRecord,
  Employee,
  MonthlyRevenue,
  TrainingAssignment,
} from '@/types'
import type { ManningCostSummaryRow } from '@/features/hr/payroll/payrollService'

/**
 * HR Overview — the visual half of hr.md §16, sitting above the eleven
 * tabular reports rather than replacing any of them: every number here links
 * back to the report that breaks it down.
 *
 * The whole workforce half comes from ONE subscription to the employee
 * register (`workforceOverview.ts` does the aggregation, pure), so no new
 * query shape, no new index and no backend aggregator — the same call
 * ActiveEmployeeReportPage and the turnover report already make.
 *
 * Two of the four Key HR Metrics read a second collection each, and both
 * degrade rather than block: attendance comes from the most recent *approved*
 * period (records are `isApproved`-gated in firestore.rules, so an unapproved
 * month is unreadable by design) and training from the assignment ledger.
 * Either one failing or being empty renders an em dash, not an error — the
 * page's headline numbers do not depend on them.
 */
function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

const APPROVED_PERIOD_STATUSES = ['approved', 'closed']

export function HrOverviewDashboardPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [outletFilter, setOutletFilter] = useState('')

  const [periods, setPeriods] = useState<AttendancePeriod[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[] | null>(null)
  const [assignments, setAssignments] = useState<TrainingAssignment[] | null>(null)

  const [costSummary, setCostSummary] = useState<ManningCostSummaryRow[]>([])
  const [revenue, setRevenue] = useState<MonthlyRevenue[]>([])
  const [costDenied, setCostDenied] = useState(false)

  useEffect(() => {
    return employeeService.subscribeToEmployees(setEmployees)
  }, [])

  useEffect(() => {
    return attendanceService.subscribeToAttendancePeriods(setPeriods, () => setPeriods([]))
  }, [])

  // `subscribeToAttendancePeriods` orders by period desc, so the first
  // approved one is the latest.
  const latestApprovedPeriod = useMemo(
    () => periods.find((period) => APPROVED_PERIOD_STATUSES.includes(period.status)) ?? null,
    [periods],
  )

  useEffect(() => {
    if (!latestApprovedPeriod) {
      setAttendance([])
      return
    }
    return attendanceService.subscribeToAttendanceRecords(latestApprovedPeriod.id, setAttendance, () =>
      setAttendance([]),
    )
  }, [latestApprovedPeriod])

  useEffect(() => {
    return trainingService.subscribeToAllTrainingAssignments(setAssignments, () => setAssignments([]))
  }, [])

  /**
   * Manning cost and revenue are narrower than this page: the callable gates on
   * hrManager/finance/GM/director/superAdmin and `monthlyRevenue`'s read rule on
   * the same set minus finance, while `/hr` also admits hrGeneralAdmin. So a
   * denial here is a real path, not a theoretical one — one flag covers both
   * sources and only that card degrades.
   */
  useEffect(() => {
    payrollService
      .getManningCostSummary()
      .then(setCostSummary)
      .catch(() => setCostDenied(true))
  }, [])

  useEffect(() => {
    return revenueService.subscribeToMonthlyRevenue(setRevenue, () => setCostDenied(true))
  }, [])

  const today = new Date().toISOString().slice(0, 10)

  const scoped = useMemo(
    () => (employees ?? []).filter((employee) => !outletFilter || employee.outletId === outletFilter),
    [employees, outletFilter],
  )
  const active = useMemo(() => scoped.filter((employee) => employee.status === 'active'), [scoped])

  const summary = useMemo(() => buildWorkforceSummary(scoped, today), [scoped, today])
  const departments = useMemo(() => departmentSlices(active), [active])
  const outlets = useMemo(() => outletSlices(active), [active])
  const genders = useMemo(() => genderSlices(active), [active])
  const types = useMemo(() => employmentTypeSlices(active), [active])
  const ages = useMemo(() => ageBands(active, today), [active, today])
  const trend = useMemo(() => headcountTrend(scoped, today), [scoped, today])
  const disciplinary = useMemo(() => disciplinarySlices(active), [active])

  const costTrend = useMemo(
    () => buildCostRevenueTrend(costSummary, revenue, outletFilter, today),
    [costSummary, revenue, outletFilter, today],
  )

  /** Attendance is company-wide: the outlet filter only scopes the register. */
  const attendanceRate = useMemo(() => {
    if (attendance === null || attendance.length === 0) return null
    const rows = buildAttendanceReportRows(attendance, 'department')
    const totalWD = rows.reduce((sum, row) => sum + row.totalWD, 0)
    const totalUL = rows.reduce((sum, row) => sum + row.totalUL, 0)
    return totalWD + totalUL === 0 ? null : totalWD / (totalWD + totalUL)
  }, [attendance])

  const trainingCompletion = useMemo(() => {
    if (assignments === null) return null
    const issued = assignments.filter((assignment) => assignment.status !== 'cancelled')
    if (issued.length === 0) return null
    return issued.filter((assignment) => assignment.status === 'completed').length / issued.length
  }, [assignments])

  if (employees === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">HR Overview</h1>
          <p className="text-sm text-muted-foreground">
            Headcount, composition and key rates across the register. Year to date, as of {today}.
          </p>
        </div>
        <Select
          aria-label="Outlet"
          value={outletFilter}
          onChange={(event) => setOutletFilter(event.target.value)}
          className="w-56"
        >
          <option value="">All outlets</option>
          {OUTLETS.map((outlet) => (
            <option key={outlet.id} value={outlet.id}>
              {outlet.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricTile label="Total Employees" value={summary.total} icon={Users} to="/hr/reports/active-employees" />
        <MetricTile
          label={`Male${summary.total ? ` · ${percent(summary.male / summary.total)}` : ''}`}
          value={summary.male}
          icon={User}
        />
        <MetricTile
          label={`Female${summary.total ? ` · ${percent(summary.female / summary.total)}` : ''}`}
          value={summary.female}
          icon={UserRound}
        />
        <MetricTile label="New Hires (YTD)" value={summary.hiresYtd} icon={UserPlus} />
        <MetricTile
          label="Exited (YTD)"
          value={summary.exitsYtd}
          icon={UserMinus}
          to="/hr/reports/resigned-employees"
        />
        <MetricTile label="Departments" value={summary.departments} icon={Building2} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employee Distribution by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart slices={departments} centerLabel="Total" total={active.length} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employee Trend</CardTitle>
            <p className="text-xs text-muted-foreground">
              Headcount at each month end, reconstructed from join and resignation dates.
            </p>
          </CardHeader>
          <CardContent>
            <TrendLine points={trend} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employment Type</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart slices={types} centerLabel="Active" total={active.length} size={150} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Age Group</CardTitle>
            {ages.unknown > 0 && (
              <p className="text-xs text-muted-foreground">
                {ages.unknown} with no usable birth date, excluded from the bands.
              </p>
            )}
          </CardHeader>
          <CardContent>
            <BarDiagram items={ages.bands.map((band) => ({ label: band.label, value: band.value }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gender</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart slices={genders} centerLabel="Active" total={active.length} size={150} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Headcount by Outlet</CardTitle>
          </CardHeader>
          <CardContent>
            <BarDiagram items={outlets.map((slice) => ({ label: slice.label, value: slice.value }))} maxBars={12} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Employees by Disciplinary Action</CardTitle>
            <p className="text-xs text-muted-foreground">
              {disciplinary.none} of {active.length} active with nothing on file. This is the standing flag on the
              employee record, which HR sets by hand — not a count of filed communication records.
            </p>
          </CardHeader>
          <CardContent>
            <BarDiagram items={disciplinary.slices.map((slice) => ({ label: slice.label, value: slice.value }))} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manning Cost vs Revenue</CardTitle>
          <p className="text-xs text-muted-foreground">
            Payroll net against recorded monthly revenue, last six months
            {outletFilter ? ', for the selected outlet' : ''}. A month with no payroll imported or no revenue entered
            reads as zero.
          </p>
        </CardHeader>
        <CardContent>
          {costDenied ? (
            <EmptyState
              icon={<Lock className="h-8 w-8" aria-hidden="true" />}
              title="Access restricted"
              description="Manning cost and revenue are limited to HR Manager, Finance, General Manager, Director and Super Admin."
            />
          ) : (
            <TrendLine
              series={[
                { label: 'Manning Cost (Net)', points: costTrend.map((p) => ({ label: p.label, value: p.manningCost })) },
                { label: 'Revenue', points: costTrend.map((p) => ({ label: p.label, value: p.revenue })) },
              ]}
              valueFormatter={formatCompactCurrency}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key HR Metrics</CardTitle>
          <p className="text-xs text-muted-foreground">
            Recruitment and retention are year to date over average headcount. Attendance is the latest approved period
            {latestApprovedPeriod ? ` (${latestApprovedPeriod.period})` : ''}; training is the whole assignment ledger.
            Both are company-wide and ignore the outlet filter.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricTile
            label="Attendance Rate"
            value={attendanceRate === null ? '—' : percent(attendanceRate)}
            icon={CalendarCheck}
            to="/hr/reports/attendance"
          />
          <MetricTile
            label="Recruitment Rate (YTD)"
            value={percent(summary.recruitmentRateYtd)}
            icon={Filter}
            to="/hr/reports/recruitment-funnel"
          />
          <MetricTile
            label="Training Completion"
            value={trainingCompletion === null ? '—' : percent(trainingCompletion)}
            icon={GraduationCap}
            to="/hr/reports/training-hours"
          />
          <MetricTile
            label="Retention Rate (YTD)"
            value={percent(summary.retentionRateYtd)}
            icon={TrendingUp}
            to="/hr/reports/turnover"
          />
        </CardContent>
      </Card>
    </div>
  )
}
