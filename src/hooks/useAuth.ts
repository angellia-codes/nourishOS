import { useCallback } from 'react'
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { auth, googleProvider } from '@/services/firebase'
import { useAuthStore } from '@/store'

export function useAuth() {
  const user = useAuthStore((s) => s.firebaseUser)
  const profile = useAuthStore((s) => s.profile)
  const profileLoading = useAuthStore((s) => s.profileLoading)
  const permissions = useAuthStore((s) => s.permissions)
  const status = useAuthStore((s) => s.status)
  const error = useAuthStore((s) => s.error)

  const signIn = useCallback(async () => {
    await signInWithPopup(auth, googleProvider)
    // Profile + permissions load reactively via AuthProvider's subscription — nothing more to do here.
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
    // useAuthStore.reset() runs inside AuthProvider's onAuthStateChanged callback.
  }, [])

  return {
    user,
    profile,
    permissions,
    status,
    /** True while either the Firebase session check or the Firestore profile fetch is still in flight. */
    loading: status === 'loading' || (status === 'authenticated' && profileLoading),
    /** True only once there's both a Firebase session AND an active app profile. */
    isAuthenticated: status === 'authenticated' && profile?.status === 'active',
    error,
    signIn,
    signOut,
  }
}
