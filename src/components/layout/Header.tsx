import { Moon, Sun, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui'
import { SearchBar } from './SearchBar'
import { NotificationBell } from './NotificationBell'
import { ChatBell } from './ChatBell'
import { useAuth } from '@/hooks'
import { useThemeStore, useUIStore } from '@/store'

export function Header() {
  const { profile, signOut } = useAuth()
  const toggleMobileNav = useUIStore((s) => s.toggleMobileNav)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  const isDark =
    theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4 md:px-6">
      <div className="flex shrink-0 items-center gap-2">
        {/* The sidebar is the only nav on mobile now, so it needs a way in. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleMobileNav}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
        <span className="font-display text-lg font-semibold text-primary">NourishOS</span>
      </div>

      <SearchBar />

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </Button>

        <ChatBell />
        <NotificationBell />

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
