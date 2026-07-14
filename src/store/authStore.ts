import { create } from 'zustand'
import type { User as FirebaseUser } from 'firebase/auth'
import type { UserProfile } from '@/types'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  firebaseUser: FirebaseUser | null
  profile: UserProfile | null
  /** True until the first Firestore profile snapshot arrives — separate from `status`, which only reflects the Firebase Auth check. */
  profileLoading: boolean
  permissions: string[]
  status: AuthStatus
  /** Set when profile exists but status !== 'active' (AUTHENTICATION.md §7/§22), or on a load failure. */
  error: string | null

  setFirebaseUser: (user: FirebaseUser | null) => void
  setProfile: (profile: UserProfile | null) => void
  setProfileLoading: (loading: boolean) => void
  setPermissions: (permissions: string[]) => void
  setStatus: (status: AuthStatus) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  firebaseUser: null,
  profile: null,
  profileLoading: true,
  permissions: [] as string[],
  status: 'loading' as AuthStatus,
  error: null as string | null,
}

/**
 * Deliberately holds no Firebase listener logic itself — see
 * src/contexts/AuthProvider.tsx for the onAuthStateChanged /
 * subscribeToDocument wiring. Kept separate so any component can read auth
 * state without needing Context, per src/store/README.md.
 */
export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,
  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  setProfile: (profile) => set({ profile }),
  setProfileLoading: (profileLoading) => set({ profileLoading }),
  setPermissions: (permissions) => set({ permissions }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
