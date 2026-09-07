import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Stamp, Check, X } from 'lucide-react'
import { Button, StatusPill, Textarea } from '@/components/ui'
import { useAuth, useToast } from '@/hooks'
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
 * dashboard.md §9 / approval_engine.md §10 — the personal approval queue.
 *
 * Two sections, because they come from two different branches of the
 * approvalRequests read rule: what needs this user's decision (a role query on
 * approvalSteps, joined back) and what this user submitted (a requestedBy query).
 * Decisions come first — the queue is a to-do list, the submissions are status.
 *
 * Decision rows carry Approve/Reject inline (approval_engine.md §19 "Override").
 * The record's own page still owns the same controls; this is the only place
 * that works for a route with no detail page (attendance period, company event,
 * contract signing) and the only practical one for superAdmin, whose queue is
 * every pending step in the app rather than one role's. Authorization stays the
 * callable's — `canActOnApprovalRequest` only decides whether to draw a button.
 */
export function PendingApprovalsWidget() {
  const { user, profile } = useAuth()
  const uid = user?.uid ?? null
  const roleId = profile?.roleId ?? null

  const [queue, setQueue] = useState<approvalService.ApprovalQueueRow[] | null>(null)
  const [submitted, setSubmitted] = useState<ApprovalRequest[] | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [denied, setDenied] = useState(false)
  const [expanded, setExpanded] = useState(false)

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
  const allDecisions = queue ?? []
  const decisions = expanded ? allDecisions : allDecisions.slice(0, MAX_ROWS)
  const mine = openSubmitted.slice(0, Math.max(0, MAX_ROWS - decisions.length))
  const total = allDecisions.length + openSubmitted.length
  const actor = profile ? { uid: profile.uid, roleId: profile.roleId, outletId: profile.outletId } : null

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
              <ApprovalDecisionRow
                key={step.id}
                request={request}
                requesterName={names[request.requestedBy]}
                canDecide={approvalService.canActOnApprovalRequest(request, actor)}
              />
            ))}
            {allDecisions.length > MAX_ROWS && (
              <Button size="sm" variant="ghost" className="self-start" onClick={() => setExpanded((value) => !value)}>
                {expanded ? 'Show fewer' : `Show all ${allDecisions.length}`}
              </Button>
            )}
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

/**
 * Deliberately not a `WidgetRow`: that wraps its whole body in a `<Link>`, and
 * an Approve button nested inside a link is a broken control. The record link
 * is the row title here instead.
 */
function ApprovalDecisionRow({
  request,
  requesterName,
  canDecide,
}: {
  request: ApprovalRequest
  requesterName?: string
  canDecide: boolean
}) {
  const toast = useToast()
  const [rejecting, setRejecting] = useState(false)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  const to = approvalResourceRoute(request.module, request.resourceType, request.resourceId)
  const label = approvalResourceLabel(request.module, request.resourceType)

  async function decide(action: 'approve' | 'reject') {
    setBusy(true)
    try {
      if (action === 'approve') {
        await approvalService.approveStep({
          approvalRequestId: request.id,
          comments: comment.trim() || undefined,
        })
        toast.success('Approved.')
      } else {
        await approvalService.rejectStep({ approvalRequestId: request.id, comments: comment.trim() })
        toast.success('Rejected.')
      }
      setComment('')
      setRejecting(false)
      // The queue is a live approvalSteps subscription — the row leaves on its
      // own once the step closes out, so nothing is refetched here.
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'That did not work.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {to ? (
            <Link to={to} className="truncate text-sm font-medium text-foreground hover:underline">
              {label}
            </Link>
          ) : (
            <p className="truncate text-sm font-medium text-foreground">{label}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {requesterName ?? 'Someone'} · {formatRelativeTime(request.createdAt)}
          </p>
        </div>
        <StatusPill
          tone={APPROVAL_STATUS_TONE[request.approvalStatus]}
          icon={APPROVAL_STATUS_ICON[request.approvalStatus]}
          label={APPROVAL_STATUS_LABELS[request.approvalStatus]}
        />
      </div>

      {canDecide && (
        <>
          {rejecting && (
            <Textarea
              aria-label="Reason for rejecting"
              rows={2}
              placeholder="Reason for rejecting (required)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          )}
          <div className="flex flex-wrap gap-2">
            {rejecting ? (
              <>
                <Button size="sm" variant="danger" disabled={busy || !comment.trim()} onClick={() => void decide('reject')}>
                  <X className="mr-1 h-4 w-4" aria-hidden="true" />
                  Confirm reject
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setRejecting(false)}>
                  Back
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" disabled={busy} onClick={() => void decide('approve')}>
                  <Check className="mr-1 h-4 w-4" aria-hidden="true" />
                  Approve
                </Button>
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => setRejecting(true)}>
                  <X className="mr-1 h-4 w-4" aria-hidden="true" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
