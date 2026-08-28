import { useNavigate } from 'react-router-dom'
import {
  UserCheck,
  UserMinus,
  TrendingDown,
  Users,
  Activity,
  CalendarClock,
  Filter,
  MessageCircleQuestion,
  GraduationCap,
  Package,
  CalendarCheck,
} from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'

/**
 * HR Reports hub — hr.md §16. Ten reports over data the HR sub-modules
 * already collect (employees, requisitions, HR Inventory). No permission
 * gating on the cards, same as HrHomePage: each report reads collections
 * already gated by firestore.rules — except Exit Interview Insights, which
 * calls a callable instead of reading exitInterviews directly (see that
 * page's own comment).
 */
const REPORTS = [
  {
    to: '/hr/reports/active-employees',
    icon: UserCheck,
    title: 'Active Employee',
    description: 'Current roster, grouped by outlet and department.',
  },
  {
    to: '/hr/reports/resigned-employees',
    icon: UserMinus,
    title: 'Resigned Employee',
    description: 'Separations with resignation date and reason.',
  },
  {
    to: '/hr/reports/turnover',
    icon: TrendingDown,
    title: 'Employee Turnover',
    description: 'Total active/resigned plus MTD and YTD turnover, by outlet and department.',
  },
  {
    to: '/hr/reports/manning-budget',
    icon: Users,
    title: 'Manning Budget & Cost',
    description: 'Budgeted vs actual headcount by season; manning cost vs monthly revenue.',
  },
  {
    to: '/hr/reports/employee-activity',
    icon: Activity,
    title: 'Employee Activity',
    description: 'Hire, update and archive events across the roster.',
  },
  {
    to: '/hr/reports/training-hours',
    icon: GraduationCap,
    title: 'Training Hours',
    description: 'Completed training hours, per employee.',
  },
  {
    to: '/hr/reports/inventory-cost',
    icon: Package,
    title: 'Inventory Cost',
    description: 'Uniform and asset cost by outlet, department, item and month.',
  },
  {
    to: '/hr/reports/upcoming-activity-budget',
    icon: CalendarClock,
    title: 'Upcoming Activity and Budget',
    description: 'Interviews, onboarding, contract/probation ends and open vacancies ahead.',
  },
  {
    to: '/hr/reports/recruitment-funnel',
    icon: Filter,
    title: 'Recruitment Funnel',
    description: 'Pipeline funnel and time-to-hire, by position and department.',
  },
  {
    to: '/hr/reports/exit-interview-insights',
    icon: MessageCircleQuestion,
    title: 'Exit Interview Insights',
    description: 'Turnover reasons, satisfaction trend and manager ratings (aggregate only).',
  },
  {
    to: '/hr/reports/attendance',
    icon: CalendarCheck,
    title: 'Attendance',
    description: 'Total attendance, leave utilisation and punctuality, by period.',
  },
]

export function HrReportsPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">HR Reports</h1>
        <p className="text-sm text-muted-foreground">Standard reports over the employee register and HR sub-modules.</p>
      </div>

      {REPORTS.map(({ to, icon: Icon, title, description }) => (
        <Card key={to}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-medium text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate(to)}>
              Open
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
