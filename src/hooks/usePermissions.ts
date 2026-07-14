import { useAuthStore } from '@/store'
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/utils'

export function usePermissions() {
  const permissions = useAuthStore((s) => s.permissions)

  return {
    permissions,
    can: (permission: string) => hasPermission(permissions, permission),
    canAny: (required: string[]) => hasAnyPermission(permissions, required),
    canAll: (required: string[]) => hasAllPermissions(permissions, required),
  }
}
