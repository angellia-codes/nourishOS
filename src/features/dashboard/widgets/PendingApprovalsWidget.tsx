import { useEffect, useMemo, useState } from 'react'
import { Stamp } from 'lucide-react'
import { StatusPill } from '@/components/ui'
import { useAuth } from '@/hooks'
import { approvalService, userService } from '@/services/shared'
import { formatRelativeTime } from '@/utils'
import { DashboardWidget, WidgetRow } from './DashboardWidget'
import {
  APPROVAL_STATUS_ICON,
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_TONE,
  approvalResourceLabel,
  approvalResourceRoute,
  isOpenApproval,
} from '../dashboardFormat'
import type { ApprovalRequest } from '@/types'

const MAX_ROWS = 5

/**
 * dashboard.md §9 / approval_engine.md §10 — the personal approval queue, which
 * nothing in the app surfaced until now.
 *
 * Two sections, because they come from two different branches of the
 * approvalRequests read rule: what needs this user's decision (a role query on
 * approvalSteps, joined back) and what this user submitted (a requestedBy query).
 * Decisions come first — the queue is a to-do list, the submissions are status.
 *
 * Read-only by design: a row links to the record's own page, which already owns
 * the approve/reject flow.
 */
export function PendingApprovalsWidget() {
  const { user, profile } = useAuth()
  const uid = user?.uid ?? null
  const roleId = profile?.roleId ?? null

  const [queue, setQueue] = useState<approvalService.ApprovalQueueRow[] | null>(null)
  const [submitted, setSubmitted] = useState<ApprovalRequest[] | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!roleId) return
    return approvalService.subscribeToApprovalQueue(roleId, setQueue, () => {
      setDenied(true)
      setQueue([])
    })
  }, [roleId])

  useEffect(() => {
    if (!uid) return
    return approvalService.subscribeToMyApprovalRequests(uid, setSubmitted, () => setSubmitted([]))
  }, [uid])

  useEffect(() => {
    return userService.subscribeToDirectory(
      (users) => setNames(Object.fromEntries(users.map((entry) => [entry.uid, entry.displayName]))),
      () => setNames({}),
    )
  }, [])

  const openSubmitted = useMemo(
    () => (submitted ?? []).filter((request) => isOpenApproval(request.approvalStatus)),
    [submitted],
  )

  const loading = queue === null || submitted === null
  const decisions = (queue ?? []).slice(0, MAX_ROWS)
  const mine = openSubmitted.slice(0, Math.max(0, MAX_ROWS - decisions.length))
  const total = (queue ?? []).length + openSubmitted.length

  return (
    <DashboardWidget
      title="Pending Approvals"
      icon={Stamp}
      count={loading ? undefined : total}
      // No "View all": there is no approval queue page, and pointing at
      // /recruitment/requisitions would send an approver to a resource list that shows
      // approved requisitions rather than the ones awaiting them.
      loading={loading}
      denied={denied}
      emptyText="Nothing waiting on you, and nothing of yours in flight."
    >
      <div className="flex flex-col gap-3">
        {decisions.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Needs your decision
            </h3>
            {decisions.map(({ step, request }) => (
              <WidgetRow
                key={step.id}
                to={approvalResourceRoute(request.module, request.resourceType, request.resourceId)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {approvalResourceLabel(request.module, request.resourceType)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {names[request.requestedBy] ?? 'Someone'} · {formatRelativeTime(request.createdAt)}
                  </p>
                </div>
                <StatusPill
                  tone={APPROVAL_STATUS_TONE[request.approvalStatus]}
                  icon={APPROVAL_STATUS_ICON[request.approvalStatus]}
                  label={APPROVAL_STATUS_LABELS[request.approvalStatus]}
                />
              </WidgetRow>
            ))}
          </section>
        )}

        {mine.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your submissions
            </h3>
            {mine.map((request) => (
              <WidgetRow
                key={request.id}
                to={approvalResourceRoute(request.module, request.resourceType, request.resourceId)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {approvalResourceLabel(request.module, request.resourceType)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatRelativeTime(request.createdAt)}
                  </p>
                </div>
                <StatusPill
                  tone={APPROVAL_STATUS_TONE[request.approvalStatus]}
                  icon={APPROVAL_STATUS_ICON[request.approvalStatus]}
                  label={APPROVAL_STATUS_LABELS[request.approvalStatus]}
                />
              </WidgetRow>
            ))}
          </section>
        )}
      </div>
    </DashboardWidget>
  )
}
