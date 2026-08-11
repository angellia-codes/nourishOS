import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// STYLE_GUIDE.md § Color Palette (workflow status ramp) + § Shared components.
// Generic fill+icon+shape renderer for any lifecycle state — never color alone
// (colourblind staff, glare, and cheap LCD gamma are real conditions on the floor).
// Domain modules own their own status -> {tone, icon, label} mapping and reuse
// this one component (see AppraisalStatusBadge, incidentFormat.ts, lostFoundFormat.ts) —
// keeps every module's status pills visually identical without coupling this
// primitive to any one module's status enum.
export type StatusTone = 'draft' | 'info' | 'warning' | 'success' | 'error' | 'neutral' | 'closed'

const TONE_CLASSNAME: Record<StatusTone, string> = {
  draft: 'border border-dashed border-status-draft bg-transparent text-status-draft',
  info: 'bg-status-submitted text-status-submitted-foreground',
  warning: 'bg-status-pending text-status-pending-foreground',
  success: 'bg-status-approved text-status-approved-foreground',
  error: 'bg-status-rejected text-status-rejected-foreground',
  neutral: 'bg-border text-muted-foreground',
  // the one inverted pill — a finished thing should read as closed and recede
  closed: 'bg-status-completed text-status-completed-foreground',
}

export interface StatusPillProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  tone: StatusTone
  icon: LucideIcon
  label: string
  pulseDot?: boolean
}

export function StatusPill({ tone, icon: Icon, label, pulseDot, className, ...props }: StatusPillProps) {
  return (
    <span
      role="status"
      // no whitespace-nowrap / fixed width — STYLE_GUIDE.md § Bilingual constraints:
      // Indonesian runs 15-25% longer, pills must wrap rather than truncate
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-150',
        TONE_CLASSNAME[tone],
        className,
      )}
      {...props}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {label}
      {pulseDot && (
        <span
          className="ml-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current motion-safe:animate-pulse"
          aria-hidden="true"
        />
      )}
    </span>
  )
}
