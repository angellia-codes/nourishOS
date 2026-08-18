import { useNavigate } from 'react-router-dom'
import { ClipboardList, KanbanSquare, PackageCheck } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'

/**
 * The Recruitment hub. Split out of the HR hub (2026-08-19) because the
 * pipeline has a different audience from the employee register: every
 * department head raises requisitions, while the register is HR's.
 *
 * Three sub-modules, chained in that order — requisitions → candidates →
 * onboarding. Interviews hang off a candidate rather than standing alone, so
 * they are not a card.
 *
 * No permission gating on the cards — each page enforces its own read access
 * through firestore.rules, so a card that leads to an empty list is honest
 * about what exists rather than hiding the module.
 */
const SUB_MODULES = [
  {
    to: '/recruitment/requisitions',
    icon: ClipboardList,
    title: 'Requisitions',
    description: 'Manpower requests, raised by any department head — HR then GM approve.',
  },
  {
    to: '/recruitment/candidates',
    icon: KanbanSquare,
    title: 'Candidates',
    description: 'The hiring pipeline, applied through to hired.',
  },
  {
    to: '/recruitment/onboarding',
    icon: PackageCheck,
    title: 'Onboarding',
    description: 'Document checklists for new hires.',
  },
]

export function RecruitmentHomePage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Recruitment</h1>
        <p className="text-sm text-muted-foreground">Manpower requests, hiring and onboarding.</p>
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
