import { useNavigate } from 'react-router-dom'
import { BarChart3, Boxes, ClipboardList, KanbanSquare, PackageCheck, Users } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'

/**
 * The HR hub. Six sub-modules ship: the employee register, the three halves
 * of the recruitment pipeline (requisitions → candidates → onboarding;
 * interviews hang off a candidate rather than standing alone), the
 * uniform/asset stock ledger, and the reports register.
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
    to: '/hr/requisitions',
    icon: ClipboardList,
    title: 'Requisitions',
    description: 'Manpower requests and their approval chain.',
  },
  {
    to: '/hr/candidates',
    icon: KanbanSquare,
    title: 'Candidates',
    description: 'The hiring pipeline, applied through to hired.',
  },
  {
    to: '/hr/onboarding',
    icon: PackageCheck,
    title: 'Onboarding',
    description: 'Document checklists for new hires.',
  },
  {
    to: '/hr/inventory',
    icon: Boxes,
    title: 'Inventory',
    description: 'Uniform and asset stock, movements and cost.',
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
