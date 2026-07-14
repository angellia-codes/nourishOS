import { useEffect, type ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/services/firebase'
import { subscribeToDocument, getDocument } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import { useAuthStore } from '@/store'
import { Spinner } from '@/components/ui'
import type { UserProfile } from '@/types'

interface RoleDocument {
  permissions: string[]
}

/** AUTHENTICATION.md §22 error copy, keyed by account status. */
const ACCOUNT_STATUS_MESSAGES: Record<string, string> = {
  inactive: 'Your account is inactive. Please contact HR.',
  suspended: 'Your account has been suspended.',
  terminated: 'Your account is no longer active.',
  pending: 'Your account is pending activation. Please contact HR.',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const status = useAuthStore((s) => s.status)
  const setFirebaseUser = useAuthStore((s) => s.setFirebaseUser)
  const setProfile = useAuthStore((s) => s.setProfile)
  const setProfileLoading = useAuthStore((s) => s.setProfileLoading)
  const setPermissions = useAuthStore((s) => s.setPermissions)
  const setStatus = useAuthStore((s) => s.setStatus)
  const setError = useAuthStore((s) => s.setError)
  const reset = useAuthStore((s) => s.reset)

  // Firebase session listener — fires once on mount with the persisted
  // session (or null), then again on every sign-in/sign-out.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        reset()
        setStatus('unauthenticated')
        return
      }
      setFirebaseUser(user)
      setStatus('authenticated')
    })
    return unsubscribe
  }, [reset, setFirebaseUser, setStatus])

  // Live profile subscription — re-subscribes whenever the signed-in uid
  // changes. profileLoading covers this fetch specifically so consumers
  // (ProtectedRoute) never redirect before the real profile has arrived.
  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null)
      setPermissions([])
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)
    setError(null)

    const unsubscribe = subscribeToDocument<UserProfile>(
      COLLECTIONS.USERS,
      firebaseUser.uid,
      async (profile) => {
        setProfile(profile)
        setProfileLoading(false)

        if (!profile) {
          setError('Your account is not authorized. Please contact HR.')
          setPermissions([])
          return
        }

        if (profile.status !== 'active') {
          setError(ACCOUNT_STATUS_MESSAGES[profile.status] ?? 'Your account cannot access NourishOS.')
          setPermissions([])
          return
        }

        setError(null)
        try {
          const roleDoc = await getDocument<RoleDocument>(COLLECTIONS.ROLES, profile.roleId)
          setPermissions(roleDoc?.permissions ?? [])
        } catch {
          setPermissions([])
          setError('Unable to load your permissions. Please refresh.')
        }
      },
      () => {
        setProfileLoading(false)
        setError('Unable to connect. Please try again.')
      },
    )

    return unsubscribe
  }, [firebaseUser, setProfile, setProfileLoading, setPermissions, setError])

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
