import { CROSS_OUTLET_ROLES, type Role } from '@/constants/roles'
import type { UserProfile } from '@/types'

/**
 * Client-side permission checks. UX only — per RBAC.md §11, the frontend
 * "must never assume access without backend enforcement." Every Cloud
 * Function re-validates independently; these helpers exist to hide/disable
 * UI, not to gate anything security-sensitive.
 */

export function hasPermission(userPermissions: string[], required: string): boolean {
  return userPermissions.includes(required)
}

export function hasAnyPermission(userPermissions: string[], required: string[]): boolean {
  return required.some((p) => userPermissions.includes(p))
}

export function hasAllPermissions(userPermissions: string[], required: string[]): boolean {
  return required.every((p) => userPermissions.includes(p))
}

export function isCrossOutletRole(role: Role): boolean {
  return (CROSS_OUTLET_ROLES as readonly Role[]).includes(role)
}

/** Per RBAC.md §7: cross-outlet roles may access any outlet; everyone else is scoped to their own. */
export function canAccessOutlet(user: Pick<UserProfile, 'roleId' | 'outletId'>, outletId: string): boolean {
  if (isCrossOutletRole(user.roleId)) return true
  return user.outletId === outletId
}

/** Per RBAC.md §8: department access is a straight match, no cross-department override defined in docs. */
export function canAccessDepartment(
  user: Pick<UserProfile, 'departmentId'>,
  departmentId: string,
): boolean {
  return user.departmentId === departmentId
}
