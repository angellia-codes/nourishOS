import { useNavigate } from 'react-router-dom'
import { Boxes, CalendarClock, Wrench } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'

/**
 * The Engineering hub. Work Orders moved here from Operations (2026-08-25) —
 * raising and closing a maintenance request is Engineering's work, not the
 * outlet's daily running, and the old /operations/work-orders paths redirect.
 *
 * Preventive Maintenance and Assets are placeholders: the nav structure ships
 * now, the modules follow. Their collection names are already reserved and
 * unused in `src/constants/collections.ts` (`preventiveMaintenance`,
 * `equipment`, `equipmentInspections`, `employeeAssets`).
 *
 * No permission gating on the cards — each page enforces its own read access
 * through firestore.rules, same reasoning as the other hubs.
 */
const SUB_MODULES = [
  {
    to: '/engineering/work-orders',
    icon: Wrench,
    title: 'Work Orders',
    description: 'Maintenance requests, assigned through to closed.',
  },
  {
    to: '/engineering/preventive-maintenance',
    icon: CalendarClock,
    title: 'Preventive Maintenance',
    description: 'Scheduled equipment servicing and inspection rounds.',
  },
  {
    to: '/engineering/assets',
    icon: Boxes,
    title: 'Assets',
    description: 'Equipment register, location and service history.',
  },
]

export function EngineeringHomePage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Engineering</h1>
        <p className="text-sm text-muted-foreground">Maintenance, work orders and asset care.</p>
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
