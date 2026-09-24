import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { StatusPill, type StatusTone } from '@/components/ui'
import { useAuth } from '@/hooks'
import { ROLES } from '@/constants'
import * as appraisalService from '@/features/hr/services/appraisalService'
import type { Appraisal } from '@/types'
import { DashboardWidget, WidgetRow } from './DashboardWidget'

const MAX_ROWS = 6
const ALL_APPRAISALS_ROLES: readonly string[] = [ROLES.HR_MANAGER, ROLES.GENERAL_MANAGER, ROLES.DIRECTOR, ROLES.SUPER_ADMIN]

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })
}

function daysUntil(dueDate: string, today: string): number {
  return Math.round((Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
}

function dueTone(days: number): { tone: StatusTone; label: string } {
  if (days < 0) return { tone: 'error', label: `Overdue ${-days}d` }
  if (days <= 7) return { tone: 'error', label: `${days}d left` }
  if (days <= 14) return { tone: 'warning', label: `${days}d left` }
  return { tone: 'info', label: `${days}d left` }
}

/**
 * appraisal-v2-design.md §8/§12 as revised 2026-09-24 — draft appraisals
 * (Department Head score still outstanding), soonest due first. Appraisals are
 * created 30 days before their due date, so everything here is inside that
 * window; red at D-7 and overdue, amber at D-14. HR/GM see every one; a
 * scorer role sees its own, narrowed client-side to its outlet (the outlet is
 * not in the read rule, so filtering it here is safe).
 */
export function AppraisalsDueWidget() {
  const { user, profile } = useAuth()
  const [appraisals, setAppraisals] = useState<Appraisal[] | null>(null)
  const [denied, setDenied] = useState(false)
  const roleId = profile?.roleId
  const seesAll = roleId ? ALL_APPRAISALS_ROLES.includes(roleId) : false

  useEffect(() => {
    if (!roleId) return
    setDenied(false)
    return appraisalService.subscribeToDueAppraisals(
      seesAll ? { kind: 'all' } : { kind: 'scorerRole', roleId },
      setAppraisals,
      () => setDenied(true),
    )
  }, [roleId, seesAll])

  const rows = useMemo(() => {
    const outletId = profile?.outletId ?? null
    return (appraisals ?? []).filter((a) => {
      if (!a.dueDate) return false
      if (seesAll) return true
      return (
        user !== null &&
        appraisalService.canActAsPrimaryScorer(a, { uid: user.uid, roleId: roleId ?? '', outletId })
      )
    })
  }, [appraisals, seesAll, user, roleId, profile?.outletId])

  const today = todayIso()

  return (
    <DashboardWidget
      title="Appraisals Due"
      icon={ClipboardCheck}
      count={appraisals === null ? undefined : rows.length}
      loading={appraisals === null && !denied}
      denied={denied}
      emptyText="No appraisals waiting for a Department Head score."
    >
      <div className="flex flex-col gap-2">
        {rows.slice(0, MAX_ROWS).map((a) => {
          const { tone, label } = dueTone(daysUntil(a.dueDate as string, today))
          return (
            <WidgetRow key={a.id} to={`/hr/appraisals/${a.id}`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{a.employeeName ?? a.employeeId}</p>
                <p className="truncate text-xs text-muted-foreground">{a.periodLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                {a.scorerMissing && seesAll && <StatusPill tone="warning" label="No scorer" icon={ClipboardCheck} />}
                <StatusPill tone={tone} label={label} icon={ClipboardCheck} />
              </div>
            </WidgetRow>
          )
        })}
      </div>
    </DashboardWidget>
  )
}
