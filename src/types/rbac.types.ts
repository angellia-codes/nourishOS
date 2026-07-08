import type { Timestamp } from 'firebase/firestore'
import type { Role } from '@/constants/roles'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  employeeId?: string
  roleId: Role
  departmentId: string
  outletId: string
  status: 'active' | 'inactive' | 'suspended' | 'terminated' | 'pending'
  theme?: 'light' | 'dark' | 'system'
  lastLogin?: Timestamp
}

/** Resolved permission set for the current session — computed from roleId, not stored per-user. */
export interface ResolvedPermissions {
  role: Role
  permissions: string[]
  outletId: string
  departmentId: string
  /** True for roles with cross-outlet visibility (Super Admin, Director, GM). Source: RBAC.md §7. */
  crossOutletAccess: boolean
}
