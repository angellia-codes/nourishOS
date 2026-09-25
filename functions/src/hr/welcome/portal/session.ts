import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  updatedFields,
  AppError,
  handleError,
  successResponse,
} from '../../../lib'
import { OUTLET_NAMES } from '../../../lib/organization'
import { resolveWelcomeInvite, resolveWelcomeInviteForEdit, welcomeActor } from '../invite'
import { pickWelcomeDraft } from '../whitelist'
import { WELCOME_SECTIONS } from '../content'

/**
 * welcome-portal.md §5.2 — the unauthenticated half of the Welcome Portal.
 *
 * Every callable here starts with resolveWelcomeInvite. That is the whole
 * authorization story: there is no Firebase Auth account behind a new hire
 * (§16 rules one out), so the magic link is the credential and §10.2's uniform
 * error is what keeps token probing uninformative.
 *
 * `maxInstances` is capped on each one (§10.3) — these are reachable by
 * anyone on the internet, and an unbounded Blaze-plan fan-out is a bill, not
 * an outage.
 */
const PORTAL_OPTIONS = { region: REGION, maxInstances: 10 }

/**
 * §3.3 step 3 — what the app is allowed to know before the hire has typed
 * anything. Deliberately not the employee document: outlet and brand so the
 * page can address them, the status so the banner knows which chip to show,
 * and their own saved draft. No employee number, no salary, no join date.
 */
export const getWelcomeSession = onCall(PORTAL_OPTIONS, async (request) => {
  try {
    const data = (request.data ?? {}) as Record<string, unknown>
    const { invite, employee } = await resolveWelcomeInvite(data.token)

    const outletId = (employee.outletId as string | undefined) ?? null

    return successResponse({
      outletId,
      outletLabel: outletId ? (OUTLET_NAMES[outletId] ?? outletId) : null,
      // Blank until the hire types it in step 1 — there is no HR-set name to
      // return before their first save (§3.3 step 3).
      fullName: (employee.fullName as string | undefined) ?? '',
      onboardingStatus: (employee.onboardingStatus as string | undefined) ?? 'invited',
      // §3.4 — a rejected verification unlocks the form and leaves a reason.
      // The hire has to see it, or they will resubmit the same mistake.
      rejectionReason: (employee.onboardingRejectionReason as string | null | undefined) ?? null,
      submitted: Boolean(invite.lockedAt),
      expiresAt: invite.expiresAt as string,
      draft: (invite.draft ?? {}) as Record<string, unknown>,
    })
  } catch (error) {
    return handleError(error)
  }
})

/**
 * §7.1 — autosave. Lenient by design: a half-filled step must still save, so
 * this validates shape and the whitelist but never completeness.
 *
 * §4.2's rule is that a key outside the whitelist is *rejected*, not ignored,
 * so the rejected list comes back to the caller rather than being swallowed.
 */
export const saveWelcomeDraft = onCall(PORTAL_OPTIONS, async (request) => {
  try {
    const data = (request.data ?? {}) as Record<string, unknown>
    const { ref, invite, employeeId, employee } = await resolveWelcomeInviteForEdit(data.token)

    const { draft, rejected } = pickWelcomeDraft(data.values)
    if (rejected.length > 0) {
      throw new AppError('invalid-argument', rejected[0].message, { rejected })
    }
    if (Object.keys(draft).length === 0) {
      throw new AppError('invalid-argument', 'Nothing to save.')
    }

    const merged = { ...((invite.draft ?? {}) as Record<string, unknown>), ...draft }
    await ref.update({ draft: merged, ...updatedFields(welcomeActor(employeeId, employee).uid) })

    return successResponse({ saved: Object.keys(draft) }, 'Saved.')
  } catch (error) {
    return handleError(error)
  }
})

/**
 * §7.4 — the four HR-editable sections. Takes a token like every other portal
 * callable so the app has exactly one failure mode to handle; a section that
 * has never been published comes back null rather than as an error, because an
 * empty Menu is a content gap, not a broken link.
 */
export const getWelcomeContent = onCall(PORTAL_OPTIONS, async (request) => {
  try {
    const data = (request.data ?? {}) as Record<string, unknown>
    await resolveWelcomeInvite(data.token)

    const snaps = await db.getAll(
      ...WELCOME_SECTIONS.map((section) => db.collection(COLLECTIONS.WELCOME_CONTENT).doc(section)),
    )

    const sections: Record<string, unknown> = {}
    for (const snap of snaps) {
      sections[snap.id] = snap.exists ? (snap.data()?.published ?? null) : null
    }

    return successResponse({ sections })
  } catch (error) {
    return handleError(error)
  }
})
