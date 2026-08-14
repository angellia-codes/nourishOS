import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Plus } from 'lucide-react'
import { Button, Card, CardContent, Select, Spinner, StatusPill } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { DEPARTMENTS, OUTLETS, PERMISSIONS } from '@/constants'
import { usePermissions } from '@/hooks'
import * as recruitmentService from '../recruitmentService'
import {
  REQUISITION_STATUS_ICON,
  REQUISITION_STATUS_LABELS,
  REQUISITION_STATUS_TONE,
  URGENCY_ICON,
  URGENCY_TONE,
} from '../recruitmentFormat'
import type { Requisition, RequisitionStatus } from '@/types'

const OUTLET_NAMES: Record<string, string> = Object.fromEntries(OUTLETS.map((outlet) => [outlet.id, outlet.name]))
const DEPARTMENT_NAMES: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map((department) => [department.id, department.name]),
)

/**
 * Manpower requests — employee-requisition.md. A leader sees their own
 * outlet's, HR and above see everything; that split is enforced by
 * firestore.rules, so a role with no access lands on the restricted state
 * rather than an empty list that looks like "nothing to do".
 */
export function RequisitionListPage() {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const canCreate = can(PERMISSIONS.RECRUITMENT_CREATE)

  const [rows, setRows] = useState<Requisition[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [statusFilter, setStatusFilter] = useState<RequisitionStatus | 'all'>('all')

  useEffect(() => {
    return recruitmentService.subscribeToRequisitions(
      (next) => {
        setDenied(false)
        setRows(next)
      },
      () => {
        setDenied(true)
        setRows([])
      },
    )
  }, [])

  const visible = useMemo(
    () => (rows ?? []).filter((row) => statusFilter === 'all' || row.status === statusFilter),
    [rows, statusFilter],
  )

  if (rows === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Access restricted"
          description="Your role can't view manpower requests. Ask HR if you think that's wrong."
        />
      </div>
    )
  }

  const openCount = rows.filter((row) => row.status === 'approved').length

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Requisitions</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} request{rows.length === 1 ? '' : 's'} · {openCount} open vacanc
            {openCount === 1 ? 'y' : 'ies'}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/hr/requisitions/new')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            New requisition
          </Button>
        )}
      </div>

      <div className="sm:max-w-xs">
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RequisitionStatus | 'all')}
        >
          <option value="all">All statuses</option>
          {(Object.keys(REQUISITION_STATUS_LABELS) as RequisitionStatus[]).map((status) => (
            <option key={status} value={status}>
              {REQUISITION_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No requisitions"
          description={
            rows.length === 0
              ? canCreate
                ? 'Raise the first manpower request — it goes to HR, then the GM, before the vacancy opens.'
                : 'No manpower requests have been raised yet.'
              : 'No requisitions with that status.'
          }
        />
      ) : (
        visible.map((row) => (
          <Card key={row.id} className="cursor-pointer" onClick={() => navigate(`/hr/requisitions/${row.id}`)}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted-foreground">{row.requisitionNumber ?? 'Draft'}</p>
                <p className="font-medium text-foreground">
                  {row.openings} × {row.position}
                </p>
                <p className="text-sm text-muted-foreground">
                  {OUTLET_NAMES[row.outletId] ?? row.outletId} · {DEPARTMENT_NAMES[row.departmentId] ?? row.departmentId}
                  {' · target '}
                  {row.targetJoinDate}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {row.urgency !== 'normal' && (
                  <StatusPill
                    tone={URGENCY_TONE[row.urgency]}
                    icon={URGENCY_ICON[row.urgency]}
                    label={row.urgency === 'critical' ? 'Critical' : 'Urgent'}
                  />
                )}
                <StatusPill
                  tone={REQUISITION_STATUS_TONE[row.status]}
                  icon={REQUISITION_STATUS_ICON[row.status]}
                  label={REQUISITION_STATUS_LABELS[row.status]}
                />
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
