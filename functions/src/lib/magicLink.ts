import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { addDaysIso } from './timestamps'

/**
 * Magic-link credentials, shared by every token-authenticated portal.
 *
 * Extracted from functions/src/recruitment/portal/token.ts, which owned this
 * logic alone until the New-Hire Welcome Portal needed the same primitives
 * (welcome-portal.md §3.2). Importing the recruitment module from an HR
 * function would be cross-module coupling, so the crypto lives here and each
 * portal keeps its own `resolve*` trust boundary on top of it.
 *
 * The rules this file exists to enforce, identically for every caller:
 *  - the raw token is returned exactly once and never persisted — callers
 *    store only the SHA-256 hash;
 *  - comparison is constant-time, on the hash;
 *  - a token expires, because a WhatsApp message lives forever;
 *  - shape is checked before any database lookup, so a probe costs nothing.
 */

/** 32 random bytes as base64url is always 43 characters. */
const TOKEN_LENGTH = 43

export interface IssuedMagicLink {
  /** Returned to the caller once. Never persisted anywhere in this codebase. */
  token: string
  tokenHash: string
  /** ISO date (YYYY-MM-DD), `ttlDays` from today in WITA. */
  expiresAt: string
}

export function issueMagicLink(ttlDays: number): IssuedMagicLink {
  const token = randomBytes(32).toString('base64url')
  return {
    token,
    tokenHash: hashMagicToken(token),
    expiresAt: addDaysIso(ttlDays),
  }
}

export function hashMagicToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Constant-time compare of two hex digests. Unequal lengths short-circuit. */
export function magicTokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex')
  const right = Buffer.from(b, 'hex')
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * Cheap shape check. Anything failing this cannot be one of ours, so the
 * caller refuses before spending a Firestore read on it.
 */
export function isMagicTokenShape(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const token = value.trim()
  return token.length === TOKEN_LENGTH && /^[A-Za-z0-9_-]+$/.test(token)
}
