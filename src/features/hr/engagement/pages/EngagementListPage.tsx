import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PartyPopper, Plus } from 'lucide-react'
import { Button, Card, CardContent, Spinner, StatusPill } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import * as engagementService from '../engagementService'
import { ENGAGEMENT_STATUS_ICON, ENGAGEMENT_STATUS_LABELS, ENGAGEMENT_STATUS_TONE, formatIdr } from '../engagementFormat'
import type { EmployeeEngagement } from '@/types'

/** An incident cannot be dated in the future — same TODAY convention every other HR form page uses. */
const TODAY = new Date().toISOString().slice(0, 10)

function EngagementRow({ row, onClick }: { row: EmployeeEngagement; onClick: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <button type="button" onClick={onClick} className="min-w-0 flex-1 text-left">
          <p className="truncate font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.eventDate} · {formatIdr(row.cost)} · {row.participantEmployeeIds.length} participant
            {row.participantEmployeeIds.length === 1 ? '' : 's'}
          </p>
        </button>
        <StatusPill
          tone={ENGAGEMENT_STATUS_TONE[row.status]}
          icon={ENGAGEMENT_STATUS_ICON[row.status]}
          label={ENGAGEMENT_STATUS_LABELS[row.status]}
        />
      </CardContent>
    </Card>
  )
}

/** Employee Engagement — company events/activities, cost and participants. HR-only (rules-gated). */
export function EngagementListPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<EmployeeEngagement[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () =>
      engagementService.subscribeToEngagements(
        (next) => setRows(next),
        () => setError('Your account cannot read Employee Engagement records.'),
      ),
    [],
  )

  const { upcoming, past } = useMemo(() => {
    const active = (rows ?? []).filter((row) => !row.isArchived)
    return {
      upcoming: active.filter((row) => row.status === 'planned' && row.eventDate >= TODAY),
      past: active.filter((row) => row.status !== 'planned' || row.eventDate < TODAY),
    }
  }, [rows])

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState title="No access" description={error} />
      </div>
    )
  }

  if (rows === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Employee Engagement</h1>
          <p className="text-sm text-muted-foreground">Company events and activities, cost and participants.</p>
        </div>
        <PermissionGuard permission={PERMISSIONS.EMPLOYEE_ENGAGEMENT_MANAGE}>
          <Button onClick={() => navigate('/hr/engagement/new')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            New Event
          </Button>
        </PermissionGuard>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState
          icon={<PartyPopper className="h-8 w-8" aria-hidden="true" />}
          title="No events yet"
          description="Record a company event or activity to start tracking its cost and participants."
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing planned.</p>
            ) : (
              upcoming.map((row) => (
                <EngagementRow key={row.id} row={row} onClick={() => navigate(`/hr/engagement/${row.id}`)} />
              ))
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Past</h2>
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            ) : (
              past.map((row) => (
                <EngagementRow key={row.id} row={row} onClick={() => navigate(`/hr/engagement/${row.id}`)} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
