import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, usePermissions } from '@/hooks'
import { ROUTES } from '@/constants'

interface RoleRouteProps {
  permission?: string
  anyOf?: string[]
  /** Role allow-list, for gating a whole module rather than one action. */
  roles?: string[]
}

export function RoleRoute({ permission, anyOf, roles }: RoleRouteProps) {
  const { can, canAny } = usePermissions()
  const { profile } = useAuth()

  const allowed = roles
    ? profile != null && roles.includes(profile.roleId)
    : permission
      ? can(permission)
      : anyOf
        ? canAny(anyOf)
        : true

  if (!allowed) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />
  }

  return <Outlet />
}
