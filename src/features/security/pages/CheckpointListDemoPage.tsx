import type { Timestamp } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, AlertTriangle, Plus } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'
import { formatRelativeTime, isPast } from '@/utils'
import { cn } from '@/lib/utils'
import type { Checkpoint } from '@/types'

// Demo pages carry no runtime firebase import — createdAt/updatedAt are never rendered here.
const now = { toDate: () => new Date() } as unknown as Timestamp

function mockCheckpoint(overrides: Partial<Checkpoint> & Pick<Checkpoint, 'id' | 'name'>): Checkpoint {
  return {
    createdAt: now,
    createdBy: 'demo',
    updatedAt: now,
    updatedBy: 'demo',
    isArchived: false,
    status: 'active',
    latitude: -8.65,
    longitude: 115.13,
    geofenceRadiusMeters: 30,
    scheduleIntervalMinutes: 60,
    lastVisitedAt: null,
    lastVisitedBy: null,
    ...overrides,
  }
}

const MOCK_CHECKPOINTS: Checkpoint[] = [
  mockCheckpoint({
    id: 'demo-1',
    name: 'Main Entrance — Outlet Sanur',
    lastVisitedAt: new Date(Date.now() - 20 * 60 * 1000),
    lastVisitedBy: 'demo-guard-1',
  }),
  mockCheckpoint({
    id: 'demo-2',
    name: 'Kitchen Back Door — Outlet Canggu',
    scheduleIntervalMinutes: 45,
    lastVisitedAt: new Date(Date.now() - 90 * 60 * 1000),
    lastVisitedBy: 'demo-guard-2',
  }),
  mockCheckpoint({
    id: 'demo-3',
    name: 'Parking Area — Outlet Ubud',
    lastVisitedAt: null,
  }),
]

function isOverdue(checkpoint: Checkpoint): boolean {
  if (!checkpoint.lastVisitedAt) return true
  const dueAt = new Date(checkpoint.lastVisitedAt).getTime() + checkpoint.scheduleIntervalMinutes * 60 * 1000
  return isPast(new Date(dueAt))
}

/**
 * Read-only visual preview of CheckpointListPage seeded with static mock data
 * instead of a live Firestore subscription — no auth, no backend calls.
 */
export function CheckpointListDemoPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. The real, auth-protected version lives at /security.
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Patrol Checkpoints</h1>
            <p className="text-sm text-muted-foreground">Preview only — patrol logging requires the real app.</p>
          </div>
          <Button type="button" size="sm" onClick={() => navigate('/demo/security/checkpoints/new')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Register Control Point
          </Button>
        </div>

        {MOCK_CHECKPOINTS.map((checkpoint) => {
          const overdue = isOverdue(checkpoint)
          return (
            <Card key={checkpoint.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    overdue ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success',
                  )}
                >
                  {overdue ? (
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>

                <div className="flex-1">
                  <p className="font-medium text-foreground">{checkpoint.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {checkpoint.lastVisitedAt
                      ? `Last patrolled ${formatRelativeTime(checkpoint.lastVisitedAt)}`
                      : 'Never patrolled'}
                    {overdue && ' · Overdue'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
