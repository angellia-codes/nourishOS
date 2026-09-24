import { notifyUsersByRole } from '../../shared/notifications'

/**
 * One notice to everyone accountable for an appraisal: the scorer role (at the
 * subject's outlet when pinned), HR Manager and GM. In-app only — WhatsApp
 * resolves through users/{uid}.employeeId, which nothing populates yet.
 */
export async function notifyAppraisalParties(input: {
  appraisalId: string
  scorerRoleId: string
  scorerOutletId: string | null
  title: string
  message: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  /** GM only — the overdue escalation. */
  gmOnly?: boolean
}): Promise<void> {
  const base = {
    module: 'hr',
    title: input.title,
    message: input.message,
    referenceId: input.appraisalId,
    priority: input.priority,
  }
  const roles = input.gmOnly ? ['generalManager'] : [input.scorerRoleId, 'hrManager', 'generalManager']
  const seen = new Set<string>()
  for (const role of roles) {
    if (seen.has(role)) continue
    seen.add(role)
    const outletId = role === input.scorerRoleId && input.scorerOutletId ? input.scorerOutletId : undefined
    await notifyUsersByRole({ ...base, role, outletId })
  }
}
