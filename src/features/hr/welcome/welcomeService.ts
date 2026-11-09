import { callFunction } from '@/services/api/callFunction'

/**
 * New-Hire Welcome Portal — the authenticated half (welcome-portal.md §5.1).
 *
 * The portal app itself talks to its own unauthenticated callables from
 * `welcome/src/api.ts`; nothing in NourishOS calls those. What lives here is
 * what HR does from inside the app: send the link, resend it, revoke it, and
 * curate the editable content sections.
 */

export interface WelcomeInviteResult {
  inviteId: string
  expiresAt: string
  /** False when Fonnte is unprovisioned or the send failed — HR needs to know. */
  delivered: boolean
  /**
   * The full invite link, raw token included — welcome-portal.md §3.3 / §10.9
   * (v1.7). Interim while Fonnte isn't connected (F4): shown once on the
   * Onboarding tab for HR to copy. Hold it in component state only; never
   * persist it anywhere. Absent until the functions are redeployed.
   */
  link?: string
}

export function issueWelcomeInvite(checklistId: string): Promise<WelcomeInviteResult> {
  return callFunction('issueWelcomeInvite', { checklistId })
}

export function reissueWelcomeInvite(checklistId: string): Promise<WelcomeInviteResult> {
  return callFunction('reissueWelcomeInvite', { checklistId })
}

export function revokeWelcomeInvite(checklistId: string): Promise<{ inviteId: string }> {
  return callFunction('revokeWelcomeInvite', { checklistId })
}
