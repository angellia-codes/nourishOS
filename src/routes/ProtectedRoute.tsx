import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { ROUTES } from '@/constants'

/**
 * AuthProvider already blocks on the initial Firebase check with a
 * full-screen loader, so by the time this renders, status is never
 * 'loading' — only 'authenticated' or 'unauthenticated'. This component
 * handles what happens once that's known.
 */
export function ProtectedRoute() {
  const { status, profile, loading, error, isAuthenticated } = useAuth()
  const location = useLocation()

  if (status === 'unauthenticated') {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  // Session exists, but the Firestore profile fetch (or role/permissions
  // fetch) hasn't resolved yet — wait rather than redirect prematurely.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }

  if (!isAuthenticated || !profile) {
    return <Navigate to={ROUTES.UNAUTHORIZED} state={{ reason: error }} replace />
  }

  return <Outlet />
}
