import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, ClipboardList, Wallet, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants'

const ITEMS = [
  { to: ROUTES.DASHBOARD, label: 'Home', icon: LayoutDashboard, end: true },
  { to: ROUTES.HR, label: 'HR', icon: Users, end: false },
  { to: ROUTES.OPERATIONS, label: 'Ops', icon: ClipboardList, end: false },
  { to: ROUTES.FINANCE, label: 'Finance', icon: Wallet, end: false },
  { to: ROUTES.SETTINGS, label: 'Settings', icon: Settings, end: false },
] as const

export function BottomNav() {
  return (
    <nav className="flex shrink-0 items-center justify-around border-t border-border bg-surface py-2 md:hidden">
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium transition-colors duration-150',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )
          }
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
