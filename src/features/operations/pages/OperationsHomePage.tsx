import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, KanbanSquare, LayoutList, PackageSearch, ShieldAlert, Wrench } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'

/**
 * The Operations hub — same "index becomes a hub once a module has 2+
 * sub-modules" precedent as HR and Documents. Daily Updates moves off the
 * bare /operations index (previously its own feed) to /operations/daily-updates.
 * The two Checklist cards were absorbed into Shift Reports (2026-08-19).
 *
 * No permission gating on the cards — each page enforces its own read access
 * through firestore.rules, same reasoning as the other hubs.
 */
const SUB_MODULES = [
  {
    to: '/operations/daily-updates',
    icon: LayoutList,
    title: 'Daily Updates',
    description: 'Head-of-Department reports across all outlets.',
  },
  {
    to: '/operations/lost-found',
    icon: PackageSearch,
    title: 'Lost & Found',
    description: 'Items found on-site, claimed or disposed.',
  },
  {
    to: '/operations/incidents',
    icon: ShieldAlert,
    title: 'Incident Reports',
    description: 'Logging, investigation and resolution.',
  },
  {
    to: '/operations/work-orders',
    icon: Wrench,
    title: 'Work Orders',
    description: 'Engineering requests, assigned through to closed.',
  },
  {
    to: '/operations/projects',
    icon: KanbanSquare,
    title: 'Projects',
    description: 'Company-wide projects across the five-column board.',
  },
  {
    to: '/operations/shift-reports',
    icon: ClipboardCheck,
    title: 'Shift Reports',
    description: 'Opening and closing reports, including the shift checklist.',
  },
]

export function OperationsHomePage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Operations</h1>
        <p className="text-sm text-muted-foreground">Daily running of every outlet.</p>
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
