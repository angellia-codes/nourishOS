import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { db, COLLECTIONS, AppError, addDaysIso, todayIso, type AuthedUser } from '../../lib'
import type { CandidateStage } from '../helpers'

/**
 * Candidate Portal — candidate_portal.md §4, with one confirmed deviation:
 * candidates get NO Firebase Auth account. The application link is the whole
 * credential (a magic link), so this module is the only thing standing between
 * the public internet and a candidate's own record.
 *
 * Rules therefore:
 *  - the raw token is returned exactly once, at startApplication, and never
 *    stored — Firestore keeps only its SHA-256 hash;
 *  - comparison is constant-time, on the hash;
 *  - the token expires (30 days), because a WhatsApp message lives forever;
 *  - a token authorises exactly one candidate document, nothing else.
 */

const TOKEN_TTL_DAYS = 30

/** Stages at which the candidate may still edit their own application. */
const EDITABLE_STAGES: readonly CandidateStage[] = ['ST-01']

export interface IssuedToken {
  /** Returned to the portal once. Never persisted anywhere in this codebase. */
  token: string
  portalTokenHash: string
  portalTokenExpiresAt: string
}

export function issueToken(): IssuedToken {
  const token = randomBytes(32).toString('base64url')
  return {
    token,
    portalTokenHash: hashToken(token),
    portalTokenExpiresAt: addDaysIso(TOKEN_TTL_DAYS),
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Constant-time compare of two hex digests of equal length. */
function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex')
  const right = Buffer.from(b, 'hex')
  return left.length === right.length && timingSafeEqual(left, right)
}

export interface ResolvedCandidate {
  candidateId: string
  candidate: FirebaseFirestore.DocumentData
  ref: FirebaseFirestore.DocumentReference
}

/**
 * The portal's `requireActiveUser`. Resolves an application token to the one
 * candidate it belongs to, or refuses. Every failure returns the same
 * permission-denied message: a caller probing tokens learns nothing about
 * whether a given token exists, only that theirs does not work.
 */
export async function resolveCandidateByToken(rawToken: unknown): Promise<ResolvedCandidate> {
  const token = typeof rawToken === 'string' ? rawToken.trim() : ''
  // 32 bytes base64url is 43 chars; anything else cannot be one of ours.
  if (token.length !== 43 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new AppError('permission-denied', 'That application link is not valid. Ask HR for a new one.')
  }

  const snap = await db
    .collection(COLLECTIONS.CANDIDATES)
    .where('portalTokenHash', '==', hashToken(token))
    .limit(1)
    .get()

  if (snap.empty) {
    throw new AppError('permission-denied', 'That application link is not valid. Ask HR for a new one.')
  }

  const doc = snap.docs[0]
  const candidate = doc.data()

  // Belt and braces: the query already matched on the hash, but comparing it
  // again in constant time keeps the check in one place if the lookup ever
  // changes shape (e.g. token id in the URL plus a secret).
  if (!hashesMatch(candidate.portalTokenHash as string, hashToken(token))) {
    throw new AppError('permission-denied', 'That application link is not valid. Ask HR for a new one.')
  }

  const expiresAt = candidate.portalTokenExpiresAt as string | undefined
  if (!expiresAt || expiresAt < todayIso()) {
    throw new AppError('permission-denied', 'That application link has expired. Ask HR for a new one.')
  }

  return { candidateId: doc.id, candidate, ref: doc.ref }
}

/**
 * Resolve for a write. A submitted application is read-only to the candidate —
 * employment-application-form.md §6 gives them view-only access once it is in,
 * and HR owns the record from Screening onwards.
 */
export async function resolveCandidateForEdit(rawToken: unknown): Promise<ResolvedCandidate> {
  const resolved = await resolveCandidateByToken(rawToken)
  if (!EDITABLE_STAGES.includes(resolved.candidate.currentStage as CandidateStage)) {
    throw new AppError(
      'failed-precondition',
      'Your application has already been submitted and can no longer be edited. Contact HR if something needs correcting.',
    )
  }
  return resolved
}

/**
 * Audit actor for portal writes. There is no `users/{uid}` doc behind a
 * candidate, so audit entries carry the candidate as the actor — same
 * synthetic-user shape as probationReviewTrigger.ts's SYSTEM_USER.
 */
export function portalActor(candidateId: string, candidate: FirebaseFirestore.DocumentData): AuthedUser {
  return {
    uid: `portal:${candidateId}`,
    email: (candidate.email as string | null) ?? null,
    displayName: `${candidate.fullName as string} (candidate)`,
    roleId: 'candidate',
    departmentId: (candidate.departmentId as string | null) ?? null,
    outletId: (candidate.outletId as string | null) ?? null,
    permissions: [],
    employeeId: null,
  }
}
