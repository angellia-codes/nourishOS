import { callAction, getSessionToken } from '@/services/appsScript/client'
import { toApiError } from '@/services/api/errors'
import { useAuthStore } from '@/store'
import type { UserProfile } from '@/types'

interface MeResponse {
  user: UserProfile & { permissions: string[] }
}

/** AUTHENTICATION.md §22 error copy, keyed by account status. */
const ACCOUNT_STATUS_MESSAGES: Record<string, string> = {
  inactive: 'Your account is inactive. Please contact HR.',
  suspended: 'Your account has been suspended.',
  terminated: 'Your account is no longer active.',
  pending: 'Your account is pending activation. Please contact HR.',
}

/**
 * Fetches 'auth.me' and syncs the result into authStore. Shared by
 * AuthProvider's poll loop and useAuth().signIn/signOut so a fresh sign-in
 * reflects immediately instead of waiting for the next poll tick.
 */
export async function refreshAuthState(): Promise<void> {
  const store = useAuthStore.getState()
  const token = getSessionToken()

  if (!token) {
    store.reset()
    store.setStatus('unauthenticated')
    return
  }

  store.setStatus('authenticated')
  store.setProfileLoading(true)
  store.setError(null)

  try {
    const { user } = await callAction<MeResponse>('auth.me')
    const { permissions, ...profile } = user
    store.setProfile(profile as UserProfile)
    store.setProfileLoading(false)

    if (profile.status !== 'active') {
      store.setError(ACCOUNT_STATUS_MESSAGES[profile.status] ?? 'Your account cannot access NourishOS.')
      store.setPermissions([])
      return
    }
    store.setError(null)
    store.setPermissions(permissions)
  } catch (error) {
    store.setProfileLoading(false)
    store.setError(toApiError(error).message)
  }
}
