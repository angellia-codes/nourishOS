import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarDays,
  ClipboardList,
  Wallet,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES, ROLES } from '@/constants'
import { useUIStore } from '@/store'
import { useAuth } from '@/hooks'

const NAV_ITEMS = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, end: true },
  // HR is GM/Director/HR/superAdmin only — same allow-list the /hr route
  // gate uses, so the nav never offers a link that redirects.
  { to: ROUTES.HR, label: 'HR', icon: Users, end: false, roles: [ROLES.GENERAL_MANAGER, ROLES.DIRECTOR, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN] },
  { to: ROUTES.RECRUITMENT, label: 'Recruitment', icon: UserPlus, end: false },
  { to: ROUTES.CALENDAR, label: 'Calendar', icon: CalendarDays, end: false },
  { to: ROUTES.OPERATIONS, label: 'Operations', icon: ClipboardList, end: false },
  { to: ROUTES.SECURITY, label: 'Security', icon: Shield, end: false },
  { to: ROUTES.FINANCE, label: 'Finance', icon: Wallet, end: false },
  { to: ROUTES.DOCUMENTS, label: 'Documents', icon: FileText, end: false },
  { to: ROUTES.COMMUNICATIONS, label: 'Communication', icon: MessageSquare, end: false },
  { to: ROUTES.REPORTS, label: 'Reports', icon: BarChart3, end: false },
  { to: ROUTES.SETTINGS, label: 'Settings', icon: Settings, end: false },
] as const satisfies readonly { to: string; label: string; icon: typeof Users; end: boolean; roles?: readonly string[] }[]

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen)
  const closeMobileNav = useUIStore((s) => s.closeMobileNav)
  const location = useLocation()
  const { profile } = useAuth()
  // `some` rather than `includes`: the const-asserted role tuples narrow to
  // literals, which `includes(Role)` rejects.
  const navItems = NAV_ITEMS.filter((item) => !('roles' in item) || item.roles.some((role) => role === profile?.roleId))

  // Following a link on mobile should get you to the page, not leave the
  // drawer sitting over it.
  useEffect(() => {
    closeMobileNav()
  }, [location.pathname, closeMobileNav])

  return (
    <>
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 md:hidden"
          onClick={closeMobileNav}
          aria-hidden="true"
        />
      )}

    <aside
      className={cn(
        // Mobile: an off-canvas drawer over the content, since the bottom nav
        // is gone. Desktop: the same rail as before, in normal flow.
        'fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-border bg-surface transition-all duration-200',
        'md:static md:z-auto md:translate-x-0',
        mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'md:w-[72px]' : 'md:w-60',
      )}
    >
      <button
        type="button"
        onClick={closeMobileNav}
        className="flex items-center gap-2 border-b border-border p-3 text-xs text-muted-foreground md:hidden"
        aria-label="Close navigation"
      >
        <X className="h-4 w-4" aria-hidden="true" />
        Close
      </button>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-border/50 hover:text-foreground',
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={toggleSidebar}
        className="hidden items-center justify-center gap-2 border-t border-border p-3 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground md:flex"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        ) : (
          <>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Collapse
          </>
        )}
      </button>
    </aside>
    </>
  )
}
