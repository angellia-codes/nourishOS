import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ChevronRight, AlertTriangle, Pencil, Plus } from 'lucide-react'
import { Button, Card, CardContent, Spinner, StatusPill } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import * as securityService from '@/features/security/services/securityService'
import { outletName } from '@/features/security/securityFormat'
import { formatRelativeTime, isPast } from '@/utils'
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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Patrol Checkpoints</h1>
          <p className="text-sm text-muted-foreground">Select a checkpoint to log your patrol.</p>
        </div>
        <PermissionGuard permission={PERMISSIONS.CHECKPOINTS_MANAGE}>
          <Button onClick={() => navigate('/security/checkpoints/new')}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Add checkpoint
          </Button>
        </PermissionGuard>
      </div>

      {checkpoints.length === 0 ? (
        <EmptyState title="No checkpoints registered yet" description="Add a checkpoint to start scheduling patrols." />
      ) : (
        checkpoints.map((checkpoint) => {
          const overdue = isOverdue(checkpoint)
          return (
            <Card
              key={checkpoint.id}
              className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
              onClick={() => navigate(`/security/checkpoints/${checkpoint.id}/patrol`)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {checkpoint.name}
                      {/* Pre-2026-08-20 checkpoints may have no outletId — omit the label rather than show "undefined". */}
                      {checkpoint.outletId && (
                        <span className="font-normal text-muted-foreground"> &middot; {outletName(checkpoint.outletId)}</span>
                      )}
                    </p>
                    <StatusPill
                      tone={overdue ? 'warning' : 'success'}
                      icon={overdue ? AlertTriangle : ShieldCheck}
                      label={overdue ? 'Overdue' : 'On Time'}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {checkpoint.lastVisitedAt
                      ? `Last patrolled ${formatRelativeTime(checkpoint.lastVisitedAt)}${
                          checkpoint.lastVisitedByName ? ` by ${checkpoint.lastVisitedByName}` : ''
                        }`
                      : 'Never patrolled'}
                  </p>
                </div>

                <PermissionGuard permission={PERMISSIONS.CHECKPOINTS_MANAGE}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      // Row itself navigates to the patrol capture screen — this
                      // button must not also trigger that.
                      e.stopPropagation()
                      navigate(`/security/checkpoints/${checkpoint.id}/edit`)
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </Button>
                </PermissionGuard>

                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
