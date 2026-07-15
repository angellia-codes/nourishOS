import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Wallet,
  ShoppingCart,
  Package,
  Heart,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants'
import { useUIStore } from '@/store'

const NAV_ITEMS = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: ROUTES.HR, label: 'HR', icon: Users, end: false },
  { to: ROUTES.OPERATIONS, label: 'Operations', icon: ClipboardList, end: false },
  { to: ROUTES.SECURITY, label: 'Security', icon: Shield, end: false },
  { to: ROUTES.FINANCE, label: 'Finance', icon: Wallet, end: false },
  { to: ROUTES.PURCHASING, label: 'Purchasing', icon: ShoppingCart, end: false },
  { to: ROUTES.INVENTORY, label: 'Inventory', icon: Package, end: false },
  { to: ROUTES.CRM, label: 'CRM', icon: Heart, end: false },
  { to: ROUTES.DOCUMENTS, label: 'Documents', icon: FileText, end: false },
  { to: ROUTES.COMMUNICATIONS, label: 'Communication', icon: MessageSquare, end: false },
  { to: ROUTES.REPORTS, label: 'Reports', icon: BarChart3, end: false },
  { to: ROUTES.SETTINGS, label: 'Settings', icon: Settings, end: false },
] as const

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-border bg-surface transition-all duration-200 md:flex',
        collapsed ? 'w-[72px]' : 'w-60',
      )}
    >
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
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
        className="flex items-center justify-center gap-2 border-t border-border p-3 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
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
  )
}
