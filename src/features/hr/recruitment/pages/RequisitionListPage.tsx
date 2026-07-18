import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, Card, CardContent, Select, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { POSITION_LABELS } from '@/constants/positions'
import type { PositionId } from '@/constants/positions'
import type { Requisition, RequisitionStatus } from '@/types'
import * as requisitionService from '../requisitionService'
import { REQUISITION_STATUS_LABELS, REQUISITION_STATUS_VARIANT, URGENCY_LABELS, formatRequisitionDate } from '../requisitionFormat'

function positionLabel(req: Requisition): string {
  if (req.positionId && req.positionId in POSITION_LABELS) return POSITION_LABELS[req.positionId as PositionId]
  return req.positionTitleFallback ?? 'Unspecified position'
}

/** employee-requisition.md §7/§9 — manpower requests, scoped by the firestore.rules read grant. */
export function RequisitionListPage() {
  const navigate = useNavigate()
  const [requisitions, setRequisitions] = useState<Requisition[] | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | RequisitionStatus>('all')

  useEffect(() => {
    return requisitionService.subscribeToRequisitions(setRequisitions)
  }, [])

  if (requisitions === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const pendingCount = requisitions.filter((r) => r.status === 'pendingApproval').length
  const visible = statusFilter === 'all' ? requisitions : requisitions.filter((r) => r.status === statusFilter)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Requisitions</h1>
          <p className="text-sm text-muted-foreground">{pendingCount} awaiting a step in the approval chain</p>
        </div>
        <Button type="button" onClick={() => navigate('/hr/recruitment/new')}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          New Requisition
        </Button>
      </div>

      <Select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | RequisitionStatus)}>
        <option value="all">All statuses</option>
        {Object.entries(REQUISITION_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      {visible.length === 0 ? (
        <EmptyState
          title="No requisitions"
          description={requisitions.length === 0 ? 'Nothing has been raised yet.' : 'Nothing matches that status.'}
        />
      ) : (
        visible.map((req) => (
          <Card
            key={req.id}
            className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
            onClick={() => navigate(`/hr/recruitment/${req.id}`)}
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <p className="font-medium text-foreground">
                  {positionLabel(req)}
                  {req.requisitionNumber && (
                    <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{req.requisitionNumber}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {req.openings} opening{req.openings > 1 ? 's' : ''} · {URGENCY_LABELS[req.urgency]} · target {formatRequisitionDate(req.targetJoinDate)}
                </p>
              </div>
              <Badge variant={REQUISITION_STATUS_VARIANT[req.status]}>{REQUISITION_STATUS_LABELS[req.status]}</Badge>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
