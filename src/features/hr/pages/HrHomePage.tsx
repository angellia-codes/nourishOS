import { useNavigate } from 'react-router-dom'
import { BarChart3, Boxes, GraduationCap, LogOut, UserPlus, Users } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'

/**
 * The HR hub. Five sub-modules ship: the employee register, offboarding (exit checklists, clearance and exit interviews — the OUT
 * counterpart to onboarding, triggered from Archive on the employee profile),
 * the uniform/asset stock ledger, the training catalog, and the reports
 * register. Employment Contracts is not a card here — like Disciplinary
 * Records, it's reached from the employee profile since it's always
 * employee-scoped, not a register of its own. The hiring pipeline left for
 * its own /recruitment module (2026-08-19) and is linked from here as a
 * cross-reference rather than owned.
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
    description: 'Catalog, assignment and completion tracking.',
  },
  {
    to: '/recruitment',
    icon: UserPlus,
    title: 'Recruitment',
    description: 'Requisitions, candidates and onboarding — now its own module.',
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
        <h1 className="text-xl font-semibold text-foreground">Human Resources</h1>
        <p className="text-sm text-muted-foreground">People, hiring and onboarding.</p>
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
