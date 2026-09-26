import {
  db,
  COLLECTIONS,
  AppError,
  todayIso,
  hashMagicToken,
  isMagicTokenShape,
  magicTokensMatch,
  type AuthedUser,
} from '../../lib'

/**
 * New-Hire Welcome Portal — welcome-portal.md §3.1/§10.
 *
 * `resolveWelcomeInvite` is to this app what `requireActiveUser` is everywhere
 * else: the magic link is the entire credential, so this function is the only
 * thing standing between the public internet and an employee record holding a
 * NIK, a KTP scan and a bank account number.
 *
 * §10.2 — every failure returns the *identical* message. A caller probing
 * tokens must not be able to tell "no such invite" from "expired" from
 * "revoked"; the one thing they can learn is that theirs does not work.
 */

export const WELCOME_TOKEN_TTL_DAYS = 30

const INVALID_LINK = 'This link isn’t valid. Ask HR for a new one.'

export interface ResolvedWelcomeInvite {
  inviteId: string
  invite: FirebaseFirestore.DocumentData
  ref: FirebaseFirestore.DocumentReference
  employeeId: string
  employee: FirebaseFirestore.DocumentData
  employeeRef: FirebaseFirestore.DocumentReference
}

export async function resolveWelcomeInvite(rawToken: unknown): Promise<ResolvedWelcomeInvite> {
  // Shape first: a probe that isn't even the right length costs no read.
  if (!isMagicTokenShape(rawToken)) {
    throw new AppError('permission-denied', INVALID_LINK)
  }
  const token = rawToken.trim()

  const snap = await db
    .collection(COLLECTIONS.ONBOARDING_INVITES)
    .where('tokenHash', '==', hashMagicToken(token))
    .limit(1)
    .get()

  if (snap.empty) {
    throw new AppError('permission-denied', INVALID_LINK)
  }

  const doc = snap.docs[0]
  const invite = doc.data()

  // The query already matched on the hash; comparing again in constant time
  // keeps the check in one place if the lookup ever changes shape.
  if (!magicTokensMatch(invite.tokenHash as string, hashMagicToken(token))) {
    throw new AppError('permission-denied', INVALID_LINK)
  }
  if (invite.revokedAt) {
    throw new AppError('permission-denied', INVALID_LINK)
  }
  const expiresAt = invite.expiresAt as string | undefined
  if (!expiresAt || expiresAt < todayIso()) {
    throw new AppError('permission-denied', INVALID_LINK)
  }

  // §10.5 — a token authorises exactly one employee. Resolving the employee
  // here rather than from anything the caller sent is what makes that true.
  const employeeId = invite.employeeId as string
  const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId)
  const employeeSnap = await employeeRef.get()
  if (!employeeSnap.exists) {
    throw new AppError('permission-denied', INVALID_LINK)
  }

  return {
    inviteId: doc.id,
    invite,
    ref: doc.ref,
    employeeId,
    employee: employeeSnap.data()!,
    employeeRef,
  }
}

/**
 * Resolve for a write. §2 D6: the form locks on submit, but the welcome banner
 * and the content sections stay open until the token expires — so this is the
 * narrower of the two resolvers, not a replacement for it.
 */
export async function resolveWelcomeInviteForEdit(rawToken: unknown): Promise<ResolvedWelcomeInvite> {
  const resolved = await resolveWelcomeInvite(rawToken)
  if (resolved.invite.lockedAt) {
    throw new AppError(
      'failed-precondition',
      'Your details have already been submitted. Contact HR if something needs correcting.',
    )
  }
  return resolved
}

/**
 * Audit actor for portal writes (§5.2). There is no `users/{uid}` doc behind a
 * new hire — they have no NourishOS account and §16 says they never will — so
 * audit entries carry the employee as the actor, the same synthetic-user shape
 * recruitment/portal/token.ts's portalActor uses.
 */
export function welcomeActor(employeeId: string, employee: FirebaseFirestore.DocumentData): AuthedUser {
  return {
    uid: `portal:${employeeId}`,
    email: (employee.email as string | null) ?? null,
    displayName: `${(employee.fullName as string) || 'New hire'} (new hire)`,
    roleId: 'newHire',
    departmentId: (employee.departmentId as string | null) ?? null,
    outletId: (employee.outletId as string | null) ?? null,
    permissions: [],
    employeeId,
  }
}

/**
 * The latest invite issued for an employee, live or not — reissue and revoke
 * both need it. Equality on `employeeId` plus `orderBy createdAt desc`, so it
 * needs the `onboardingInvites` composite in firestore.indexes.json.
 */
export async function findLatestInvite(
  employeeId: string,
): Promise<FirebaseFirestore.QueryDocumentSnapshot | null> {
  const snap = await db
    .collection(COLLECTIONS.ONBOARDING_INVITES)
    .where('employeeId', '==', employeeId)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
  return snap.empty ? null : snap.docs[0]
}

/**
 * §3.3 step 2 — the link that goes into the WhatsApp message. `WELCOME_BASE_URL`
 * is a plain env var, not a secret: it is a public URL. Mirrors
 * recruitment/whatsappTemplates.ts's portalApplicationUrl exactly.
 *
 * The fallback was `https://welcome.nourishgroup.id`, a custom domain never
 * actually attached to anything — the deployed app has no `WELCOME_BASE_URL`
 * set anywhere, so every link this produced was broken. `welcome/` deployed
 * to Vercel 2026-09-26 as `ngi-welcome-portal`; its real, live URL is now the
 * fallback. Point this at a custom domain instead once one exists, by setting
 * `WELCOME_BASE_URL` at deploy time — the fallback is what ships without it.
 */
export function welcomeLinkUrl(token: string): string {
  const base = (process.env.WELCOME_BASE_URL ?? 'https://ngi-welcome-portal.vercel.app').replace(/\/+$/, '')
  return `${base}/?t=${token}`
}
