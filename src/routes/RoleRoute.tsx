import { Navigate, Outlet } from 'react-router-dom'
import { usePermissions } from '@/hooks'
import { ROUTES } from '@/constants'

interface RoleRouteProps {
  permission?: string
  anyOf?: string[]
}

export function RoleRoute({ permission, anyOf }: RoleRouteProps) {
  const { can, canAny } = usePermissions()

  const allowed = permission ? can(permission) : anyOf ? canAny(anyOf) : true

  if (!allowed) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />
  }

  return <Outlet />
}
