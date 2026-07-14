import type { ReactNode } from 'react'
import { usePermissions } from '@/hooks'

interface PermissionGuardProps {
  permission?: string
  anyOf?: string[]
  children: ReactNode
  /** Rendered instead when the check fails. Omit to render nothing. */
  fallback?: ReactNode
}

export function PermissionGuard({ permission, anyOf, children, fallback = null }: PermissionGuardProps) {
  const { can, canAny } = usePermissions()
  const allowed = permission ? can(permission) : anyOf ? canAny(anyOf) : true
  return <>{allowed ? children : fallback}</>
}
