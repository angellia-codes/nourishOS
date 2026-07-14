import { useEffect, type ReactNode } from 'react'
import { useThemeStore, useAuthStore, type ThemePreference } from '@/store'

function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return pref
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const profile = useAuthStore((s) => s.profile)

  useEffect(() => {
    const apply = () => {
      document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark')
    }
    apply()

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', apply)
      return () => mediaQuery.removeEventListener('change', apply)
    }
  }, [theme])

  // Opportunistic one-way sync: once a profile loads with a saved theme
  // preference, adopt it so the setting follows the user across devices.
  // Not a two-way binding — writing the preference back on manual toggle
  // is Settings' job once that module exists.
  useEffect(() => {
    if (profile?.theme && profile.theme !== theme) {
      setTheme(profile.theme)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.theme])

  return <>{children}</>
}
