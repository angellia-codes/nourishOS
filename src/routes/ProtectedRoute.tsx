import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { ROUTES } from '@/constants'
import { Spinner } from '@/components/ui'

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
        <Spinner />
      </div>
    )
  }

  // Signed in with no profile at all — a first-time account, not a rejected
  // one. Send them to registration rather than a dead-end "access restricted"
  // screen (AUTHENTICATION.md §5 deviation, see RegisterPage).
  if (!profile) {
    return <Navigate to={ROUTES.REGISTER} replace />
  }

  // Profile exists but isn't active (suspended, pending, terminated) — that
  // is a real denial and registering again wouldn't change it.
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.UNAUTHORIZED} state={{ reason: error }} replace />
  }

  return <Outlet />
}
