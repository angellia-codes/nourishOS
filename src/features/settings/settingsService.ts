import { callFunction } from '@/services/api'
import { getDocument } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { RoleDocument } from '@/types'

export function getRole(roleId: string): Promise<RoleDocument | null> {
  return getDocument<RoleDocument>(COLLECTIONS.ROLES, roleId)
}

export function updateRolePermissions(roleId: string, permissions: string[]): Promise<{ roleId: string; permissions: string[] }> {
  return callFunction('updateRolePermissions', { roleId, permissions })
}
