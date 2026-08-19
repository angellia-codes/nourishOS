import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui'

interface DashboardWidgetProps {
  title: string
  icon: LucideIcon
  /** Total across the whole source, not just the rows shown — the widget lists at most five. */
  count?: number
  /** Omit when the widget has no fuller page yet — there is no approval queue page. */
  viewAllTo?: string
  loading: boolean
  /** Rules denials surface as a subscription error, which is a different message from "nothing here". */
  denied?: boolean
  emptyText: string
  children: ReactNode
  className?: string
}

/**
 * The shell every dashboard widget shares — dashboard.md §21: each widget owns
 * its own loading state so a slow one never blocks the page, and §22: every
 * widget has an explicit empty state rather than rendering nothing.
 */
export function DashboardWidget({
  title,
  icon: Icon,
  count,
  viewAllTo,
  loading,
  denied,
  emptyText,
  children,
  className,
}: DashboardWidgetProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {title}
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{count}</span>
          )}
        </CardTitle>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="flex shrink-0 items-center gap-1 text-xs text-primary transition-colors duration-150 hover:underline"
          >
            View all
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : denied ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            You don&apos;t have access to this data.
          </p>
        ) : count === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

/** One row of a widget list. A row without a `to` renders as plain text — see dashboardFormat's unmapped routes. */
export function WidgetRow({ to, children }: { to?: string | null; children: ReactNode }) {
  const body = (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
      {children}
    </div>
  )

  if (!to) return body
  return (
    <Link to={to} className="block transition-colors duration-150 hover:bg-border/30">
      {body}
    </Link>
  )
}
