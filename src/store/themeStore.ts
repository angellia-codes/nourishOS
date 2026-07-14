import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
}

/**
 * Persisted locally so the correct theme applies before the auth/profile
 * load completes (STYLE_GUIDE.md §24: "User preference should persist
 * across sessions"). ThemeProvider opportunistically syncs this with
 * profile.theme once a session loads, so it also follows the user across
 * devices — see src/contexts/ThemeProvider.tsx.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'nourishos-theme' },
  ),
)
