import type { CallableRequest } from 'firebase-functions/v2/https'
import { db } from './admin'
import { COLLECTIONS } from './collections'
import { AppError } from './errors'

/**
 * The authenticated caller, resolved server-side from users/{uid} +
 * roles/{roleId} — never from request.data or custom claims alone, so a
 * stale token can't outrun a role change or suspension (RBAC.md: functions
 * are the enforcement layer; client checks and rules are UX/read gating).
 */
export interface AuthedUser {
  uid: string
  email: string | null
  displayName: string
  roleId: string
  departmentId: string | null
  outletId: string | null
  permissions: string[]
}

/** Cheapest gate — signed in at all. Prefer requireActiveUser for anything that mutates. */
export function requireAuth(request: CallableRequest): string {
  const uid = request.auth?.uid
  if (!uid) {
    throw new AppError('unauthenticated', 'You must be signed in.')
  }
  return uid
}

/**
 * Loads the caller's profile and role, enforcing that the account exists
 * and is active. Every mutating callable starts with this.
 */
export async function requireActiveUser(request: CallableRequest): Promise<AuthedUser> {
  const uid = requireAuth(request)

  const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get()
  if (!userSnap.exists) {
    throw new AppError('permission-denied', 'Your account is not authorized. Please contact HR.')
  }
  const profile = userSnap.data()!

  if (profile.status !== 'active') {
    throw new AppError('permission-denied', `Your account is ${profile.status ?? 'not active'}.`)
  }
  if (!profile.roleId) {
    throw new AppError('permission-denied', 'Your account has no role assigned. Please contact HR.')
  }

  const roleSnap = await db.collection(COLLECTIONS.ROLES).doc(profile.roleId).get()
  const permissions = (roleSnap.data()?.permissions as string[] | undefined) ?? []

  return {
    uid,
    email: (profile.email as string | undefined) ?? null,
    displayName: (profile.displayName as string | undefined) ?? '',
    roleId: profile.roleId as string,
    departmentId: (profile.departmentId as string | undefined) ?? null,
    outletId: (profile.outletId as string | undefined) ?? null,
    permissions,
  }
}

/**
 * Throws permission-denied unless the caller's role grants `permission`.
 * superAdmin always passes: it's deliberately absent from ROLE_PERMISSIONS
 * (organization.ts) and its roles/superAdmin doc was seeded by hand once, so
 * every permission string added since has needed a manual Firestore edit to
 * reach it — the exact bypass requireSuperAdmin already relies on, extended
 * to every permission-string check instead of just the handful of callables
 * that call requireSuperAdmin directly.
 */
export function requirePermission(user: AuthedUser, permission: string): void {
  if (user.roleId === 'superAdmin') return
  if (!user.permissions.includes(permission)) {
    throw new AppError('permission-denied', 'You do not have permission to perform this action.')
  }
}

/** Throws permission-denied unless the caller holds at least one of `permissions`. superAdmin always passes — see requirePermission. */
export function requireAnyPermission(user: AuthedUser, permissions: string[]): void {
  if (user.roleId === 'superAdmin') return
  if (!permissions.some((permission) => user.permissions.includes(permission))) {
    throw new AppError('permission-denied', 'You do not have permission to perform this action.')
  }
}

/**
 * The one role-based gate in this codebase; everything else checks permission
 * strings. superAdmin is deliberately absent from ROLE_PERMISSIONS
 * (organization.ts) and its roles/superAdmin doc was seeded by hand, so a new
 * permission string would not be in that document and every call would fail
 * permission-denied until somebody edited Firestore. Comparing the role is the
 * only check that is true on a fresh install.
 */
export function requireSuperAdmin(user: AuthedUser, action = 'perform this action'): void {
  if (user.roleId !== 'superAdmin') {
    throw new AppError('permission-denied', `Only a super admin can ${action}.`)
  }
}
