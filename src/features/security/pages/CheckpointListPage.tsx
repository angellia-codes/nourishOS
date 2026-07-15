import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ChevronRight, AlertTriangle } from 'lucide-react'
import { Card, CardContent, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import * as securityService from '@/features/security/services/securityService'
import { formatRelativeTime, isPast } from '@/utils'
import { cn } from '@/lib/utils'
import type { Checkpoint } from '@/types'

function isOverdue(checkpoint: Checkpoint): boolean {
  if (!checkpoint.lastVisitedAt) return true
  const dueAt = new Date(checkpoint.lastVisitedAt).getTime() + checkpoint.scheduleIntervalMinutes * 60 * 1000
  return isPast(new Date(dueAt))
}

export function CheckpointListPage() {
  const navigate = useNavigate()
  const [checkpoints, setCheckpoints] = useState<Checkpoint[] | null>(null)

  useEffect(() => {
    return securityService.subscribeToActiveCheckpoints(setCheckpoints)
  }, [])

  if (checkpoints === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (checkpoints.length === 0) {
    return (
      <EmptyState
        title="No checkpoints registered yet"
        description="Checkpoint registration doesn't have an admin screen yet — ask a supervisor to add one via createCheckpoint."
      />
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Patrol Checkpoints</h1>
        <p className="text-sm text-muted-foreground">Select a checkpoint to log your patrol.</p>
      </div>

      {checkpoints.map((checkpoint) => {
        const overdue = isOverdue(checkpoint)
        return (
          <Card
            key={checkpoint.id}
            className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
            onClick={() => navigate(`/security/checkpoints/${checkpoint.id}/patrol`)}
          >
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
                  {overdue && ' \u00b7 Overdue'}
                </p>
              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
