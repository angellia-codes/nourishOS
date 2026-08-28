import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ClipboardCheck, Plus } from 'lucide-react'
import { Button, Card, CardContent, Select, Spinner, StatusPill } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { OUTLETS, PERMISSIONS } from '@/constants'
import { useAuth } from '@/hooks'
import { outletName } from '@/features/security/securityFormat'
import * as aparService from '../fireExtinguisherService'
import {
  EXTINGUISHER_STATUS_ICON,
  EXTINGUISHER_STATUS_LABELS,
  EXTINGUISHER_STATUS_TONE,
  currentPeriodMonth,
  daysUntil,
  expiryTone,
  formatPeriodMonth,
  formatUnitSpec,
  roundReferenceId,
} from '../fireExtinguisherFormat'
import type { FireExtinguisher, Task } from '@/types'

/**
 * fire-extinguisher.md §9 — the unit register. Counts are derived from this
 * list, never stored (§2.1), so the outlet filter is also the coverage count.
 */
export function ExtinguisherListPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [units, setUnits] = useState<FireExtinguisher[] | null>(null)
  const [outletFilter, setOutletFilter] = useState(profile?.outletId ?? '')
  const [round, setRound] = useState<Task | null>(null)

  useEffect(() => aparService.subscribeToRegister(setUnits), [])

  // This month's round for the viewer's own outlet, if one was generated and
  // they are on it. One equality query; assignment is checked here rather than
  // with an array-contains filter that would need a composite index.
  useEffect(() => {
    const outletId = profile?.outletId
    const uid = user?.uid
    if (!outletId || !uid) return
    let active = true
    void aparService.findRoundTask(roundReferenceId(outletId, currentPeriodMonth())).then((task) => {
      if (!active) return
      const mine = task && task.assignedTo.includes(uid) && task.taskStatus !== 'completed'
      setRound(mine ? task : null)
    })
    return () => {
      active = false
    }
  }, [profile?.outletId, user?.uid])

  const visible = useMemo(
    () => (units ?? []).filter((unit) => !outletFilter || unit.outletId === outletFilter),
    [units, outletFilter],
  )

  if (units === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Fire Extinguishers</h1>
          <p className="text-sm text-muted-foreground">
            {visible.length} registered unit{visible.length === 1 ? '' : 's'} &middot; HR-P&amp;P-03
          </p>
        </div>
        <PermissionGuard permission={PERMISSIONS.APAR_MANAGE}>
          <Button onClick={() => navigate('/security/fire-extinguishers/new')}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Register unit
          </Button>
        </PermissionGuard>
      </div>

      {round && (
        <Card className="cursor-pointer border-primary/40" onClick={() => navigate(`/security/fire-extinguishers/rounds/${round.id}`)}>
          <CardContent className="flex items-center gap-3 p-4">
            <ClipboardCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-medium text-foreground">{formatPeriodMonth(currentPeriodMonth())} inspection round</p>
              <p className="text-xs text-muted-foreground">Assigned to you — record each unit as you walk the building.</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </CardContent>
        </Card>
      )}

      <Select
        aria-label="Filter by outlet"
        value={outletFilter}
        onChange={(event) => setOutletFilter(event.target.value)}
      >
        <option value="">All outlets</option>
        {OUTLETS.map((outlet) => (
          <option key={outlet.id} value={outlet.id}>
            {outlet.name}
          </option>
        ))}
      </Select>

      {visible.length === 0 ? (
        <EmptyState
          title="No extinguishers registered"
          description="Nothing in this module works until every cylinder is logged — one pass per outlet with type, weight, location and expiry."
        />
      ) : (
        visible.map((unit) => {
          const days = daysUntil(unit.expiryDate)
          return (
            <Card
              key={unit.id}
              className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
              onClick={() => navigate(`/security/fire-extinguishers/${unit.id}`)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium text-foreground">{unit.assetCode}</span>
                    <StatusPill
                      tone={EXTINGUISHER_STATUS_TONE[unit.status]}
                      icon={EXTINGUISHER_STATUS_ICON[unit.status]}
                      label={EXTINGUISHER_STATUS_LABELS[unit.status]}
                    />
                    <StatusPill
                      tone={expiryTone(unit.expiryDate)}
                      icon={EXTINGUISHER_STATUS_ICON.expired}
                      label={
                        days === null
                          ? 'No expiry set'
                          : days <= 0
                            ? `Expired ${unit.expiryDate}`
                            : `Expires in ${days}d`
                      }
                    />
                  </div>
                  <p className="text-sm text-foreground">{unit.locationLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatUnitSpec(unit)} &middot; {outletName(unit.outletId)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
