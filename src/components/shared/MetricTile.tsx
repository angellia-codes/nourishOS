import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, Spinner } from '@/components/ui'

interface MetricTileProps {
  label: string
  value: number | null
  icon?: LucideIcon
  /** Optional — renders the tile as a link to a breakdown page, with a "View detail" affordance. */
  to?: string
}

/** STYLE_GUIDE.md § Shared components — a generic tabular-figure tile, not coupled to any one metric. */
export function MetricTile({ label, value, icon: Icon, to }: MetricTileProps) {
  const body = (
    <CardContent className="flex items-center gap-3 p-4">
      {Icon && <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
      <div className="min-w-0">
        <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
          {value === null ? <Spinner className="h-5 w-5" /> : value}
        </p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        {to && <p className="text-xs font-medium text-primary">View detail →</p>}
      </div>
    </CardContent>
  )

  if (!to) {
    return <Card>{body}</Card>
  }

  return (
    <Card>
      <Link to={to} className="block transition-colors hover:bg-muted/40">
        {body}
      </Link>
    </Card>
  )
}
