import { useEffect, type ReactNode } from 'react'
import { refreshAuthState } from './authSession'
import { useAuthStore } from '@/store'
import { Spinner } from '@/components/ui'

const ME_POLL_INTERVAL_MS = 60_000

export function AuthProvider({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status)

  // No Firebase session to listen to — a session token in localStorage
  // (set by useAuth().signIn) is the only signal of "signed in". Poll
  // 'auth.me' on mount and periodically after, since there's no push
  // equivalent for "your role/permissions changed" either.
  useEffect(() => {
    void refreshAuthState()
    const intervalId = setInterval(refreshAuthState, ME_POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [])

  // AUTHENTICATION.md §20: avoid a full-screen spinner except during initial authentication.
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    )
  }

  return <>{children}</>
}
