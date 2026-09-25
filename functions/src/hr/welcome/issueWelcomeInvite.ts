import { onCall } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  todayIso,
  issueMagicLink,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
  type AuthedUser,
} from '../../lib'
import { FONNTE_TOKEN } from '../../lib/secrets'
import { hrContactDetails, sendWhatsApp } from '../../shared/notifications'
import { findLatestInvite, welcomeLinkUrl, WELCOME_TOKEN_TTL_DAYS } from './invite'

/**
 * welcome-portal.md §3.3 step 2 / §5.1 — HR sends a new hire their welcome
 * link from the Recruitment > Onboarding tab.
 *
 * Confirmed correction to the spec: reaching "Hired" does NOT create the
 * employee draft. functions/src/recruitment/candidates.ts refuses on purpose —
 * candidate data carries no NIK, contract type or probation — so HR creates the
 * employee record first (the checklist's own "Create employee record" button)
 * and this callable is gated on that having happened. D1's "HR creates a draft
 * employee, sends a magic link" is satisfied; only the spec's claim that the
 * draft appears by itself was wrong.
 */

/** The onboarding checklist row this callable completes (§3.3, v1.5). */
const WELCOME_LINK_ITEM_NUMBER = 31

/**
 * The raw token leaves this module exactly once, in the WhatsApp message, and
 * is never returned to a caller — so `functions/test/welcome-flow.mjs` has no
 * way to drive the portal half of the flow. This env var, set only on the
 * emulator, lets the reissue response carry it.
 *
 * It is an env var rather than a build flag on purpose: a production
 * deployment that never sets it cannot be talked into returning the token, and
 * `firebase functions:config` shows at a glance whether it is set anywhere.
 */
function shouldReturnToken(): boolean {
  return process.env.WELCOME_RETURN_TOKEN === 'true'
}

interface IssueInput {
  checklistId: string
}

interface InviteTarget {
  checklistRef: FirebaseFirestore.DocumentReference
  checklist: FirebaseFirestore.DocumentData
  employeeRef: FirebaseFirestore.DocumentReference
  employee: FirebaseFirestore.DocumentData
  employeeId: string
}

/** Shared by issue and reissue: find the checklist, insist it has an employee. */
async function resolveTarget(checklistId: unknown): Promise<InviteTarget> {
  if (typeof checklistId !== 'string' || !checklistId.trim()) {
    throw new AppError('invalid-argument', 'checklistId is required.')
  }

  const checklistRef = db.collection(COLLECTIONS.ONBOARDING_CHECKLISTS).doc(checklistId.trim())
  const checklistSnap = await checklistRef.get()
  if (!checklistSnap.exists) {
    throw new AppError('not-found', 'Onboarding checklist not found.')
  }
  const checklist = checklistSnap.data()!

  const employeeId = checklist.employeeId as string | null | undefined
  if (!employeeId) {
    throw new AppError(
      'failed-precondition',
      'Create the employee record first — the welcome link writes into it, so it has to exist before the link is sent.',
    )
  }

  const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId)
  const employeeSnap = await employeeRef.get()
  if (!employeeSnap.exists) {
    throw new AppError('not-found', 'Employee record not found.')
  }

  return { checklistRef, checklist, employeeRef, employee: employeeSnap.data()!, employeeId }
}

/** Writes the invite, stamps the employee, and returns the raw token once. */
async function createInvite(
  user: AuthedUser,
  target: InviteTarget,
  checklistId: string,
  previousIssueCount: number,
): Promise<{ token: string; inviteId: string; expiresAt: string }> {
  const { token, tokenHash, expiresAt } = issueMagicLink(WELCOME_TOKEN_TTL_DAYS)

  const inviteRef = db.collection(COLLECTIONS.ONBOARDING_INVITES).doc()
  await inviteRef.set({
    employeeId: target.employeeId,
    checklistId,
    // Only ever the hash. The raw token leaves this function once, in the
    // WhatsApp message, and is never written anywhere.
    tokenHash,
    expiresAt,
    lockedAt: null,
    revokedAt: null,
    issuedBy: user.uid,
    issueCount: previousIssueCount + 1,
    // The hire's autosaved answers live here, not on the employee record —
    // nothing unverified touches the employee until submitWelcomeForm.
    draft: {},
    ...newDocumentBaseFields(user.uid),
  })

  await target.employeeRef.update({
    onboardingStatus: 'invited',
    onboardingRejectionReason: null,
    ...updatedFields(user.uid),
  })

  return { token, inviteId: inviteRef.id, expiresAt }
}

/**
 * Fire-and-log, the same contract recruitment/whatsappTemplates.ts uses: the
 * invite is already committed by this point, so a dead Fonnte device must not
 * roll it back. The caller reports `delivered` so HR can read the link out
 * loud if the message did not go.
 */
async function sendWelcomeLink(employee: FirebaseFirestore.DocumentData, token: string): Promise<boolean> {
  const target = (employee.phone as string | undefined)?.trim()
  if (!target) return false

  const hr = await hrContactDetails()
  const link = welcomeLinkUrl(token)
  const name = (employee.fullName as string | undefined)?.trim() || 'there'
  const message =
    `Halo ${name}! 👋\n\n` +
    `Selamat bergabung dengan Nourish Group Indonesia.\n\n` +
    `Silakan lengkapi data diri kamu di sini:\n${link}\n\n` +
    `Link ini berlaku ${WELCOME_TOKEN_TTL_DAYS} hari dan hanya untuk kamu — jangan dibagikan.\n\n` +
    `Hi ${name}! Welcome to Nourish. Please complete your details at the link above. ` +
    `It is valid for ${WELCOME_TOKEN_TTL_DAYS} days and is personal to you.` +
    (hr.phone ? `\n\n${hr.name}\nNourish Group Indonesia\n${hr.phone}` : `\n\n${hr.name}\nNourish Group Indonesia`)

  try {
    const result = await sendWhatsApp(target, message)
    if (result.status === 'failed') {
      logger.warn(`Welcome link not delivered: ${result.error}`)
      return false
    }
    return result.status === 'sent'
  } catch (error) {
    logger.error('Welcome link WhatsApp threw', error)
    return false
  }
}

/**
 * Marks checklist item 31 received. Firestore cannot address an array element
 * by index, so the whole `documentChecklist` is rewritten — the same thing
 * createEmployeeInternal does for item 19.
 *
 * A checklist created before this item existed simply has no row 31, and the
 * map is a no-op. That is correct: a requirement added today cannot be
 * retroactively imposed on a hire already halfway through onboarding.
 */
async function markWelcomeLinkItemSent(target: InviteTarget, actorUid: string): Promise<void> {
  const items = (target.checklist.documentChecklist ?? []) as Record<string, unknown>[]
  const documentChecklist = items.map((item) =>
    item.itemNumber === WELCOME_LINK_ITEM_NUMBER
      ? {
          ...item,
          status: 'received',
          linkedRecordType: 'employee',
          linkedRecordId: target.employeeId,
          receivedDate: todayIso(),
        }
      : item,
  )

  await target.checklistRef.update({
    documentChecklist,
    // Denormalised so the Onboarding tab can label the button "Resend" without
    // reading onboardingInvites — a collection no client may read at all.
    welcomeInviteSentAt: todayIso(),
    ...updatedFields(actorUid),
  })
}

export const issueWelcomeInvite = onCall({ region: REGION, secrets: [FONNTE_TOKEN] }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_INVITE)

    const { checklistId } = (request.data ?? {}) as Partial<IssueInput>
    const target = await resolveTarget(checklistId)

    const existing = await findLatestInvite(target.employeeId)
    if (existing && !existing.data().revokedAt) {
      throw new AppError(
        'already-exists',
        'A welcome link has already been sent. Use Resend welcome link to issue a new one.',
      )
    }

    const { token, inviteId, expiresAt } = await createInvite(user, target, checklistId as string, 0)
    await markWelcomeLinkItemSent(target, user.uid)
    const delivered = await sendWelcomeLink(target.employee, token)

    await recordAuditEvent({
      eventType: 'WelcomeInviteIssued',
      category: 'HR',
      module: 'hr',
      resourceType: 'onboardingInvite',
      resourceId: inviteId,
      action: 'create',
      user,
      // Never the token, and never its hash: an audit log is read by more
      // people than the invite document is.
      newValues: { employeeId: target.employeeId, checklistId, expiresAt, delivered },
    })

    return successResponse(
      { inviteId, expiresAt, delivered },
      delivered ? 'Welcome link sent.' : 'Welcome link created, but the WhatsApp message did not send.',
    )
  } catch (error) {
    return handleError(error)
  }
})

/**
 * §2 D6 — "HR can re-issue". A lost message or a 30-day token that ran out
 * both land here. Deliberately does NOT re-touch checklist item 31: the link
 * was sent, and sending it twice is not two completions of one step.
 */
export const reissueWelcomeInvite = onCall({ region: REGION, secrets: [FONNTE_TOKEN] }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_INVITE)

    const { checklistId } = (request.data ?? {}) as Partial<IssueInput>
    const target = await resolveTarget(checklistId)

    const existing = await findLatestInvite(target.employeeId)
    if (existing?.data().lockedAt && !existing.data().revokedAt) {
      throw new AppError(
        'failed-precondition',
        'This hire has already submitted their details. Reject the verification first if they need to correct something.',
      )
    }

    const previousIssueCount = (existing?.data().issueCount as number | undefined) ?? 0
    if (existing) {
      // Revoke before issuing, not after: if the second write fails, the hire
      // is left with no working link rather than two.
      await existing.ref.update({ revokedAt: todayIso(), ...updatedFields(user.uid) })
    }

    const { token, inviteId, expiresAt } = await createInvite(
      user,
      target,
      checklistId as string,
      previousIssueCount,
    )
    const delivered = await sendWelcomeLink(target.employee, token)

    await recordAuditEvent({
      eventType: 'WelcomeInviteReissued',
      category: 'HR',
      module: 'hr',
      resourceType: 'onboardingInvite',
      resourceId: inviteId,
      action: 'create',
      user,
      newValues: { employeeId: target.employeeId, checklistId, expiresAt, delivered, issue: previousIssueCount + 1 },
    })

    return successResponse(
      { inviteId, expiresAt, delivered, ...(shouldReturnToken() ? { token } : {}) },
      delivered ? 'New welcome link sent.' : 'New welcome link created, but the WhatsApp message did not send.',
    )
  } catch (error) {
    return handleError(error)
  }
})

/** §5.1 — kills the link without issuing a replacement. */
export const revokeWelcomeInvite = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_INVITE)

    const { checklistId } = (request.data ?? {}) as Partial<IssueInput>
    const target = await resolveTarget(checklistId)

    const existing = await findLatestInvite(target.employeeId)
    if (!existing || existing.data().revokedAt) {
      throw new AppError('not-found', 'There is no active welcome link for this hire.')
    }

    await existing.ref.update({ revokedAt: todayIso(), ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'WelcomeInviteRevoked',
      category: 'HR',
      module: 'hr',
      resourceType: 'onboardingInvite',
      resourceId: existing.id,
      action: 'update',
      user,
      newValues: { employeeId: target.employeeId },
    })

    return successResponse({ inviteId: existing.id }, 'Welcome link revoked.')
  } catch (error) {
    return handleError(error)
  }
})
