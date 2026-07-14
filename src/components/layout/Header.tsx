import { Moon, Sun, LogOut } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuth } from '@/hooks'
import { useThemeStore } from '@/store'

export function Header() {
  const { profile, signOut } = useAuth()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  const isDark =
    theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <span className="font-display text-lg text-primary">NourishOS</span>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </Button>

        <div className="mx-1 hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight text-foreground">{profile?.displayName}</p>
          <p className="text-xs leading-tight text-muted-foreground">{profile?.roleId}</p>
        </div>

        <Button type="button" variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Sign out">
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </header>
  )
}
