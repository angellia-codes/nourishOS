import { create } from 'zustand'
import type { UserProfile } from '@/types'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  profile: UserProfile | null
  profileLoading: boolean
  permissions: string[]
  status: AuthStatus
  /** Set when profile exists but status !== 'active' (AUTHENTICATION.md §7/§22), or on a load failure. */
  error: string | null

  setProfile: (profile: UserProfile | null) => void
  setProfileLoading: (loading: boolean) => void
  setPermissions: (permissions: string[]) => void
  setStatus: (status: AuthStatus) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  profile: null,
  profileLoading: true,
  permissions: [] as string[],
  status: 'loading' as AuthStatus,
  error: null as string | null,
}

/**
 * Deliberately holds no session logic itself — see
 * src/contexts/AuthProvider.tsx for the sign-in / 'auth.me' polling wiring.
 * Kept separate so any component can read auth state without needing
 * Context, per src/store/README.md.
 */
export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,
  setProfile: (profile) => set({ profile }),
  setProfileLoading: (profileLoading) => set({ profileLoading }),
  setPermissions: (permissions) => set({ permissions }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
