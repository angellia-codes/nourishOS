import { useAuthStore } from '@/store'
import type { Role } from '@/constants/roles'

export function useRole() {
  const roleId = useAuthStore((s) => s.profile?.roleId ?? null)

  return {
    roleId,
    isRole: (role: Role) => roleId === role,
    isAnyRole: (roles: Role[]) => (roleId ? roles.includes(roleId) : false),
  }
}
