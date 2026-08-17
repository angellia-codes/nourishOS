import { useEffect, useMemo, useState } from 'react'
import { Briefcase } from 'lucide-react'
import { StatusPill } from '@/components/ui'
import { OUTLETS } from '@/constants'
import * as recruitmentService from '@/features/hr/recruitment/recruitmentService'
import { URGENCY_ICON, URGENCY_TONE } from '@/features/hr/recruitment/recruitmentFormat'
import { DashboardWidget, WidgetRow } from './DashboardWidget'
import type { Requisition } from '@/types'

const MAX_ROWS = 5
const OPEN_STAGES = ['open', 'sourcing', 'interviewing', 'offering']
const OUTLET_NAMES: Record<string, string> = Object.fromEntries(OUTLETS.map((o) => [o.id, o.name]))

/**
 * employee-requisition.md §9 — the "Open Positions" dashboard widget the doc
 * asks for, previously unbuilt. Approved requisitions whose vacancy is still
 * live, sorted by target join date (most urgent first).
 */
export function OpenPositionsWidget() {
  const [requisitions, setRequisitions] = useState<Requisition[] | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    return recruitmentService.subscribeToRequisitions(
      (rows) => {
        setDenied(false)
        setRequisitions(rows)
      },
      () => {
        setDenied(true)
        setRequisitions([])
      },
    )
  }, [])

  const open = useMemo(
    () =>
      (requisitions ?? [])
        .filter((r) => r.status === 'approved' && r.vacancyStage && OPEN_STAGES.includes(r.vacancyStage))
        .sort((a, b) => a.targetJoinDate.localeCompare(b.targetJoinDate)),
    [requisitions],
  )

  return (
    <DashboardWidget
      title="Open Positions"
      icon={Briefcase}
      count={requisitions === null ? undefined : open.length}
      viewAllTo="/hr/requisitions"
      loading={requisitions === null}
      denied={denied}
      emptyText="No open vacancies right now."
    >
      <div className="flex flex-col gap-2">
        {open.slice(0, MAX_ROWS).map((requisition) => (
          <WidgetRow key={requisition.id} to={`/hr/requisitions/${requisition.id}`}>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {requisition.openings - requisition.filledCount} × {requisition.position}
              </p>
              <p className="text-xs text-muted-foreground">
                {OUTLET_NAMES[requisition.outletId] ?? requisition.outletId} · Target {requisition.targetJoinDate}
              </p>
            </div>
            <StatusPill
              tone={URGENCY_TONE[requisition.urgency]}
              icon={URGENCY_ICON[requisition.urgency]}
              label={requisition.urgency}
            />
          </WidgetRow>
        ))}
      </div>
    </DashboardWidget>
  )
}
