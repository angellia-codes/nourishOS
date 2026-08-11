import { useCallback } from 'react'
import { callAction } from '@/services/appsScript/client'
import { requestGoogleAccessToken } from '@/services/appsScript/googleAuth'
import { setSessionToken, clearSessionToken } from '@/services/appsScript/client'
import { toApiError } from '@/services/api/errors'
import { refreshAuthState } from '@/contexts/authSession'
import { useAuthStore } from '@/store'

interface LoginResponse {
  sessionToken: string
}

export function useAuth() {
  const profile = useAuthStore((s) => s.profile)
  const profileLoading = useAuthStore((s) => s.profileLoading)
  const permissions = useAuthStore((s) => s.permissions)
  const status = useAuthStore((s) => s.status)
  const error = useAuthStore((s) => s.error)

  const signIn = useCallback(async () => {
    try {
      const accessToken = await requestGoogleAccessToken()
      const { sessionToken } = await callAction<LoginResponse>('auth.loginWithGoogle', { accessToken })
      setSessionToken(sessionToken)
      await refreshAuthState()
    } catch (err) {
      throw toApiError(err)
    }
  }, [])

  const signOut = useCallback(async () => {
    clearSessionToken()
    await refreshAuthState()
  }, [])

  return {
    profile,
    permissions,
    status,
    /** True while the session token check or the profile/permissions fetch is still in flight. */
    loading: status === 'loading' || (status === 'authenticated' && profileLoading),
    /** True only once there's both a session AND an active app profile. */
    isAuthenticated: status === 'authenticated' && profile?.status === 'active',
    error,
    signIn,
    signOut,
  }
}
