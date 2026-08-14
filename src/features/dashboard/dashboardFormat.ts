import type { ApprovalStatus } from '@/constants/statuses'
import type { StatusTone } from '@/components/ui'
import { Clock, Check, X, RotateCcw, Ban, FileEdit, Send, CheckCheck, AlarmClock, type LucideIcon } from 'lucide-react'

/**
 * What an approvable resource is called, and where its record lives.
 *
 * Keyed exactly like `APPROVAL_ROUTES` in functions/src/shared/approval/routes.ts
 * (`${module}/${resourceType}`). Adding a route there without adding it here
 * yields an unlinked row rather than a crash — the queue is driven by whatever
 * the engine actually routes, not by a hardcoded list of resource types.
 *
 * dashboard.md §9 also names Expense Requests, SOP Approvals, Documents and
 * Work Orders; none of those has a route in the engine yet, so none can appear.
 */
export const APPROVAL_RESOURCES: Record<string, { label: string; routeFor?: (resourceId: string) => string }> = {
  'hr/appraisal': { label: 'Appraisal', routeFor: (id) => `/hr/appraisals/${id}` },
  'hr/requisition': { label: 'Requisition', routeFor: (id) => `/hr/requisitions/${id}` },
  // No contracts UI ships yet, so this one renders as a row without a link.
  'hr/contract': { label: 'Contract' },
  'finance/expenseRequest': { label: 'Expense Request', routeFor: (id) => `/finance/expenses/${id}` },
}

export function approvalResourceKey(module: string, resourceType: string): string {
  return `${module}/${resourceType}`
}

/** Falls back to the raw resourceType so an unmapped route is still legible. */
export function approvalResourceLabel(module: string, resourceType: string): string {
  return APPROVAL_RESOURCES[approvalResourceKey(module, resourceType)]?.label ?? resourceType
}

export function approvalResourceRoute(module: string, resourceType: string, resourceId: string): string | null {
  return APPROVAL_RESOURCES[approvalResourceKey(module, resourceType)]?.routeFor?.(resourceId) ?? null
}

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  returnedForRevision: 'Returned',
  cancelled: 'Cancelled',
  completed: 'Completed',
  expired: 'Expired',
}

/** STYLE_GUIDE.md § Shared components — the workflow ramp, same mapping shape every module uses. */
export const APPROVAL_STATUS_TONE: Record<ApprovalStatus, StatusTone> = {
  draft: 'draft',
  submitted: 'info',
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  returnedForRevision: 'warning',
  cancelled: 'neutral',
  completed: 'closed',
  expired: 'error',
}

export const APPROVAL_STATUS_ICON: Record<ApprovalStatus, LucideIcon> = {
  draft: FileEdit,
  submitted: Send,
  pending: Clock,
  approved: Check,
  rejected: X,
  returnedForRevision: RotateCcw,
  cancelled: Ban,
  completed: CheckCheck,
  expired: AlarmClock,
}

/** Still in flight — approval_engine.md §5. Anything else has resolved and leaves the widget. */
const OPEN_APPROVAL_STATUSES: ApprovalStatus[] = ['draft', 'submitted', 'pending', 'returnedForRevision']

export function isOpenApproval(approvalStatus: ApprovalStatus): boolean {
  return OPEN_APPROVAL_STATUSES.includes(approvalStatus)
}
