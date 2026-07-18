import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, Card, CardContent, Select, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { usePermissions } from '@/hooks'
import { PERMISSIONS } from '@/constants'
import type { DisciplinaryAction, DisciplinaryStatus } from '@/types'
import * as disciplinaryService from '../disciplinaryService'
import {
  DISCIPLINARY_STATUS_LABELS,
  DISCIPLINARY_STATUS_VARIANT,
  DISCIPLINARY_TYPE_LABELS,
  formatDisciplinaryDate,
} from '../disciplinaryFormat'

/** employee-disciplinary-action.md §6/§8 — disciplinary records, scoped by the firestore.rules read grant. */
export function DisciplinaryListPage() {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [actions, setActions] = useState<DisciplinaryAction[] | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | DisciplinaryStatus>('all')

  useEffect(() => {
    return disciplinaryService.subscribeToDisciplinaryActions(setActions)
  }, [])

  if (actions === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const openCount = actions.filter((a) => a.status === 'underReview').length
  const visible = statusFilter === 'all' ? actions : actions.filter((a) => a.status === statusFilter)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Disciplinary Actions</h1>
          <p className="text-sm text-muted-foreground">{openCount} awaiting acknowledgment</p>
        </div>
        {can(PERMISSIONS.DISCIPLINARY_CREATE) && (
          <Button type="button" onClick={() => navigate('/hr/disciplinary/new')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            New Action
          </Button>
        )}
      </div>

      <Select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | DisciplinaryStatus)}>
        <option value="all">All statuses</option>
        {Object.entries(DISCIPLINARY_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      {visible.length === 0 ? (
        <EmptyState
          title="No disciplinary actions"
          description={actions.length === 0 ? 'Nothing has been raised yet.' : 'Nothing matches that status.'}
        />
      ) : (
        visible.map((action) => (
          <Card
            key={action.id}
            className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
            onClick={() => navigate(`/hr/disciplinary/${action.id}`)}
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <p className="font-medium text-foreground">
                  {action.employeeName}
                  <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{action.actionNumber}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {DISCIPLINARY_TYPE_LABELS[action.disciplinaryType]} · valid until {formatDisciplinaryDate(action.validUntil)}
                </p>
              </div>
              <Badge variant={DISCIPLINARY_STATUS_VARIANT[action.status]}>{DISCIPLINARY_STATUS_LABELS[action.status]}</Badge>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
