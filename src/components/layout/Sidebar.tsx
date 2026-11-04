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
import { ROUTES, HR_REPORT_ROLES } from '@/constants'
import { useUIStore } from '@/store'
import { useAuth } from '@/hooks'
import { NAV, S } from '@/constants/strings'
import { t, useLang, type Pair } from '@/lib/i18n'

/**
 * /hr is the only role-gated branch in the router (RoleRoute in routes.tsx), so
 * every child living under it carries this allow-list and nothing else does.
 * Positions, Recruitment and Employee Communication are grouped under People in
 * the nav but keep their own top-level URLs *and* their open access — positions
 * are readable by everyone, and an employee must reach their own communication
 * record. Gating them here would hide pages they are entitled to.
 *
 * Reuses HR_REPORT_ROLES rather than a second hand-copied list — the two had
 * drifted (this one was missing hrGeneralAdmin, added 2026-08-29, until fixed
 * here), which hid the whole /hr tree from a role granted its permissions
 * through Settings > Roles & Permissions.
 */
const HR_ROLES = HR_REPORT_ROLES

interface NavChild {
  to: string
  label: Pair
  end?: boolean
  roles?: readonly string[]
}

interface NavItem {
  to: string
  label: Pair
  icon: typeof Users
  end?: boolean
  roles?: readonly string[]
  children?: readonly NavChild[]
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: ROUTES.DASHBOARD, label: NAV.dashboard, icon: LayoutDashboard, end: true },
  {
    to: ROUTES.HR,
    label: NAV.people,
    icon: Users,
    roles: HR_ROLES,
    children: [
      { to: '/hr/employees', label: NAV.employees, roles: HR_ROLES },
      { to: ROUTES.POSITIONS, label: NAV.positions },
      { to: '/hr/inventory', label: NAV.inventory, roles: HR_ROLES },
      { to: ROUTES.RECRUITMENT, label: NAV.recruitment },
      { to: '/hr/training', label: NAV.trainingCatalogue, roles: HR_ROLES },
      // §5's own-assignments row: every trainee, so no `roles` gate — the page
      // is outside /hr's RoleRoute for the same reason.
      { to: '/training/me', label: NAV.myTraining },
      { to: '/hr/appraisal-templates', label: NAV.appraisal, roles: HR_ROLES },
      { to: '/communications/employee', label: NAV.employeeCommunication },
      { to: '/hr/payroll', label: NAV.payroll, roles: HR_ROLES },
      { to: '/hr/attendance', label: NAV.attendance, roles: HR_ROLES },
      { to: '/hr/reports', label: NAV.reports, roles: HR_ROLES },
      { to: '/hr/offboarding', label: NAV.offboarding, roles: HR_ROLES },
    ],
  },
  { to: ROUTES.CALENDAR, label: NAV.calendar, icon: CalendarDays },
  {
    to: ROUTES.OPERATIONS,
    label: NAV.operations,
    icon: ClipboardList,
    children: [
      { to: '/operations/daily-updates', label: NAV.dailyUpdates },
      { to: '/operations/shift-reports', label: NAV.shiftReports },
      { to: '/operations/lost-found', label: NAV.lostFound },
      { to: '/operations/incidents', label: NAV.incidents },
      { to: '/operations/projects', label: NAV.projects },
    ],
  },
  {
    to: ROUTES.ENGINEERING,
    label: NAV.engineering,
    icon: Wrench,
    children: [
      { to: '/engineering/work-orders', label: NAV.workOrders },
      { to: '/engineering/preventive-maintenance', label: NAV.preventiveMaintenance },
      { to: '/engineering/assets', label: NAV.assets },
    ],
  },
  {
    to: ROUTES.SECURITY,
    label: NAV.security,
    icon: Shield,
    children: [
      // /security's index IS the checkpoint list — there is no separate list path.
      { to: ROUTES.SECURITY, label: NAV.patrolCheckpoints, end: true },
      { to: '/security/fire-extinguishers', label: NAV.fireExtinguishers },
    ],
  },
  // One sub-module, and /finance is the expense register itself — a group with a
  // single child would just be a chevron to nowhere.
  { to: ROUTES.FINANCE, label: NAV.finance, icon: Wallet },
  {
    to: ROUTES.DOCUMENTS,
    label: NAV.documents,
    icon: FileText,
    children: [
      { to: '/documents/sop-library', label: NAV.sopLibrary },
      { to: '/documents/job-descriptions', label: NAV.jobDescriptions },
      { to: '/documents/bible', label: NAV.bible },
      // welcome-portal.md §5.1 — HR curates what a new hire reads in the
      // welcome portal. HR-only, like the rest of that app's administration.
      { to: '/documents/welcome', label: NAV.welcomeContent, roles: HR_ROLES },
    ],
  },
  {
    to: ROUTES.COMMUNICATIONS,
    label: NAV.communications,
    icon: MessageSquare,
    children: [
      { to: '/communications/announcements', label: NAV.announcements },
      { to: '/communications/tasks', label: NAV.tasks },
      // Team Chat is reached from the header ChatBell, not the nav.
    ],
  },
  { to: ROUTES.REPORTS, label: NAV.reports, icon: BarChart3 },
  {
    to: ROUTES.SETTINGS,
    label: NAV.settings,
    icon: Settings,
    children: [
      // /settings' index IS the role permissions page.
      { to: ROUTES.SETTINGS, label: NAV.rolePermissions, end: true },
      { to: '/settings/communications', label: NAV.communications },
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
  const lang = useLang()

  const navItems = NAV_ITEMS.map((item) => ({
    ...item,
    label: t(item.label, lang),
    visibleChildren:
      item.children
        ?.filter((child) => allows(child.roles, profile?.roleId))
        .map((child) => ({ ...child, label: t(child.label, lang) })) ?? [],
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
        aria-label={t(S.closeNav, lang)}
      >
        <X className="h-4 w-4" aria-hidden="true" />
        {t(S.close, lang)}
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
                  aria-label={`${t(open ? S.collapse : S.expand, lang)} ${label}`}
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
        aria-label={t(collapsed ? S.expandSidebar : S.collapseSidebar, lang)}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        ) : (
          <>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {t(S.collapse, lang)}
          </>
        )}
      </button>
    </aside>
    </>
  )
}
