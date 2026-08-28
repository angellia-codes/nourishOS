import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  Wrench,
  Wallet,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  Shield,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES, ROLES } from '@/constants'
import { useUIStore } from '@/store'
import { useAuth } from '@/hooks'

/**
 * /hr is the only role-gated branch in the router (RoleRoute in routes.tsx), so
 * every child living under it carries this allow-list and nothing else does.
 * Positions, Recruitment and Employee Communication are grouped under People in
 * the nav but keep their own top-level URLs *and* their open access — positions
 * are readable by everyone, and an employee must reach their own communication
 * record. Gating them here would hide pages they are entitled to.
 */
const HR_ROLES = [ROLES.GENERAL_MANAGER, ROLES.DIRECTOR, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN] as const

interface NavChild {
  to: string
  label: string
  end?: boolean
  roles?: readonly string[]
}

interface NavItem {
  to: string
  label: string
  icon: typeof Users
  end?: boolean
  roles?: readonly string[]
  children?: readonly NavChild[]
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, end: true },
  {
    to: ROUTES.HR,
    label: 'People',
    icon: Users,
    roles: HR_ROLES,
    children: [
      { to: '/hr/employees', label: 'Employees', roles: HR_ROLES },
      { to: ROUTES.POSITIONS, label: 'Positions' },
      { to: '/hr/inventory', label: 'Inventory', roles: HR_ROLES },
      { to: ROUTES.RECRUITMENT, label: 'Recruitment' },
      { to: '/hr/training', label: 'Training Catalogue', roles: HR_ROLES },
      // §5's own-assignments row: every trainee, so no `roles` gate — the page
      // is outside /hr's RoleRoute for the same reason.
      { to: '/training/me', label: 'My Training' },
      { to: '/hr/appraisal-templates', label: 'Appraisal', roles: HR_ROLES },
      { to: '/communications/employee', label: 'Employee Communication' },
      { to: '/hr/payroll', label: 'Payroll', roles: HR_ROLES },
      { to: '/hr/attendance', label: 'Attendance', roles: HR_ROLES },
      { to: '/hr/reports', label: 'Reports', roles: HR_ROLES },
      { to: '/hr/offboarding', label: 'Offboarding', roles: HR_ROLES },
    ],
  },
  { to: ROUTES.CALENDAR, label: 'Calendar', icon: CalendarDays },
  {
    to: ROUTES.OPERATIONS,
    label: 'Operations',
    icon: ClipboardList,
    children: [
      { to: '/operations/daily-updates', label: 'Daily Updates' },
      { to: '/operations/shift-reports', label: 'Shift Reports' },
      { to: '/operations/lost-found', label: 'Lost & Found' },
      { to: '/operations/incidents', label: 'Incident Reports' },
      { to: '/operations/projects', label: 'Projects' },
    ],
  },
  {
    to: ROUTES.ENGINEERING,
    label: 'Engineering',
    icon: Wrench,
    children: [
      { to: '/engineering/work-orders', label: 'Work Orders' },
      { to: '/engineering/preventive-maintenance', label: 'Preventive Maintenance' },
      { to: '/engineering/assets', label: 'Assets' },
    ],
  },
  {
    to: ROUTES.SECURITY,
    label: 'Security',
    icon: Shield,
    children: [
      // /security's index IS the checkpoint list — there is no separate list path.
      { to: ROUTES.SECURITY, label: 'Patrol Checkpoints', end: true },
      { to: '/security/fire-extinguishers', label: 'Fire Extinguisher Checklist' },
    ],
  },
  // One sub-module, and /finance is the expense register itself — a group with a
  // single child would just be a chevron to nowhere.
  { to: ROUTES.FINANCE, label: 'Finance', icon: Wallet },
  {
    to: ROUTES.DOCUMENTS,
    label: 'Documents',
    icon: FileText,
    children: [
      { to: '/documents/sop-library', label: 'SOP Library' },
      { to: '/documents/job-descriptions', label: 'Job Descriptions' },
      { to: '/documents/company-forms', label: 'Company Documents' },
    ],
  },
  {
    to: ROUTES.COMMUNICATIONS,
    label: 'Communications',
    icon: MessageSquare,
    children: [
      { to: '/communications/announcements', label: 'Announcements' },
      { to: '/communications/tasks', label: 'Tasks' },
      // Team Chat is reached from the header ChatBell, not the nav.
    ],
  },
  { to: ROUTES.REPORTS, label: 'Reports', icon: BarChart3 },
  {
    to: ROUTES.SETTINGS,
    label: 'Settings',
    icon: Settings,
    children: [
      // /settings' index IS the role permissions page.
      { to: ROUTES.SETTINGS, label: 'Role Permissions', end: true },
      { to: '/settings/communications', label: 'Communications' },
    ],
  },
]

// `some` rather than `includes`: the const-asserted role tuples narrow to
// literals, which `includes(Role)` rejects.
const allows = (roles: readonly string[] | undefined, roleId: string | undefined) =>
  !roles || roles.some((role) => role === roleId)

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen)
  const closeMobileNav = useUIStore((s) => s.closeMobileNav)
  const location = useLocation()
  const { profile } = useAuth()
  const [openKeys, setOpenKeys] = useState<string[]>([])

  const navItems = NAV_ITEMS.map((item) => ({
    ...item,
    visibleChildren: item.children?.filter((child) => allows(child.roles, profile?.roleId)) ?? [],
  })).filter((item) => allows(item.roles, profile?.roleId) || item.visibleChildren.length > 0)

  // Following a link on mobile should get you to the page, not leave the
  // drawer sitting over it.
  useEffect(() => {
    closeMobileNav()
  }, [location.pathname, closeMobileNav])

  const toggleGroup = (key: string) =>
    setOpenKeys((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]))

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
        {navItems.map(({ to, label, icon: Icon, end, roles, visibleChildren }) => {
          const rowClass =
            'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150'
          const idleClass = 'text-muted-foreground hover:bg-border/50 hover:text-foreground'

          // A leaf, or the collapsed rail where children are hidden anyway.
          if (visibleChildren.length === 0 || collapsed) {
            // Parent gated out but children visible (a non-HR user under People):
            // the row must not navigate, or it bounces off RoleRoute.
            if (!allows(roles, profile?.roleId)) {
              return (
                <div key={to} className={cn(rowClass, 'text-muted-foreground')} title={collapsed ? label : undefined}>
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </div>
              )
            }
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(rowClass, isActive ? 'bg-primary/10 text-primary' : idleClass)
                }
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            )
          }

          // ponytail: a group holding the active route is forced open, so
          // collapsing the section you are currently in is a no-op. Swap the
          // string[] for an explicit open/closed map if that ever annoys anyone.
          // The parent prefix too, not just the children: /hr/employees/:id and
          // /security/checkpoints/new belong to their group even though no child
          // links to them directly.
          const childActive =
            location.pathname.startsWith(to) ||
            visibleChildren.some((child) =>
              child.end ? location.pathname === child.to : location.pathname.startsWith(child.to),
            )
          const open = openKeys.includes(to) || childActive
          const canOpenParent = allows(roles, profile?.roleId)

          return (
            <div key={to}>
              <div className="flex items-center">
                {canOpenParent ? (
                  <NavLink
                    to={to}
                    end
                    className={({ isActive }) =>
                      cn(rowClass, 'flex-1', isActive ? 'bg-primary/10 text-primary' : idleClass)
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </NavLink>
                ) : (
                  <div className={cn(rowClass, 'flex-1 text-muted-foreground')}>
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => toggleGroup(to)}
                  className="rounded-md p-2 text-muted-foreground transition-colors duration-150 hover:bg-border/50 hover:text-foreground"
                  aria-expanded={open}
                  aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
                >
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform duration-150', open && 'rotate-180')}
                    aria-hidden="true"
                  />
                </button>
              </div>

              {open && (
                <div className="ml-6 flex flex-col gap-0.5 border-l border-border pl-3">
                  {visibleChildren.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end={child.end}
                      className={({ isActive }) =>
                        cn(
                          'rounded-md px-3 py-2 text-sm transition-colors duration-150',
                          isActive ? 'bg-primary/10 font-medium text-primary' : idleClass,
                        )
                      }
                    >
                      <span className="truncate">{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
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
