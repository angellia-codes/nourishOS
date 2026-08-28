import { useNavigate } from 'react-router-dom'
import { BarChart3, Boxes, Briefcase, CalendarCheck, ClipboardCheck, GraduationCap, LogOut, MessageSquareWarning, PartyPopper, UserPlus, Users, Wallet } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'

/**
 * The People hub (renamed from "HR" in the 2026-08-25 nav restructure — the
 * sidebar group and this page carry the same name). Employment Contracts is
 * not a card here: it's reached from the employee profile, since it's always
 * employee-scoped rather than a register of its own.
 *
 * Three cards link OUT of `/hr` and stay outside its role gate on purpose —
 * Recruitment (`/recruitment`), Positions (`/positions`, all-authenticated
 * read) and Employee Communication (`/communications/employee`, which the
 * employee themselves must be able to open). They belong to People in the
 * navigation, not in the URL tree.
 *
 * No permission gating on the cards — each page enforces its own read access
 * through firestore.rules, so a card that leads to an empty list is honest
 * about what exists rather than hiding the module.
 */
const SUB_MODULES = [
  {
    to: '/hr/employees',
    icon: Users,
    title: 'Employees',
    description: 'The employee register, profiles and appraisals.',
  },
  {
    to: '/hr/offboarding',
    icon: LogOut,
    title: 'Offboarding',
    description: 'Exit checklists, clearance and exit interviews.',
  },
  {
    to: '/hr/inventory',
    icon: Boxes,
    title: 'Inventory',
    description: 'Uniform and asset stock, movements and cost.',
  },
  {
    to: '/hr/training',
    icon: GraduationCap,
    title: 'Training',
    description: '197-topic catalogue, department delivery sequences and gating.',
  },
  {
    to: '/recruitment',
    icon: UserPlus,
    title: 'Recruitment',
    description: 'Requisitions, candidates and onboarding — now its own module.',
  },
  {
    to: '/positions',
    icon: Briefcase,
    title: 'Positions',
    description: 'Job descriptions, tiers and appraisal scorers — its own module.',
  },
  {
    to: '/hr/appraisal-templates',
    icon: ClipboardCheck,
    title: 'Appraisal',
    description: 'Generate, review and approve per-position appraisal criteria.',
  },
  {
    to: '/communications/employee',
    icon: MessageSquareWarning,
    title: 'Employee Communication',
    description: 'Coaching, warnings and terminations — issued, signed and tracked.',
  },
  {
    to: '/hr/payroll',
    icon: Wallet,
    title: 'Payroll',
    description: 'Payroll records, bulk import and monthly revenue.',
  },
  {
    to: '/hr/attendance',
    icon: CalendarCheck,
    title: 'Attendance',
    description: 'Monthly attendance import, approval and reporting.',
  },
  {
    to: '/hr/engagement',
    icon: PartyPopper,
    title: 'Employee Engagement',
    description: 'Company events and activities, cost and participants.',
  },
  {
    to: '/hr/reports',
    icon: BarChart3,
    title: 'Reports',
    description: 'Headcount, turnover, manning budget and cost.',
  },
]

export function HrHomePage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">People</h1>
        <p className="text-sm text-muted-foreground">The employee lifecycle, from hiring to exit.</p>
      </div>

      {SUB_MODULES.map(({ to, icon: Icon, title, description }) => (
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
