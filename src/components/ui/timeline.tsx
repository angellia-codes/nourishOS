import * as React from 'react'
import { cn } from '@/lib/utils'

// COMPONENT_LIBRARY.md §9 — for approval history / activity logs. Extracted from the
// hand-rolled dot+line pattern previously duplicated per-page (e.g. EmployeeProfilePage).
export function Timeline({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul role="list" className={cn('flex flex-col gap-3', className)} {...props} />
}

export interface TimelineItemProps extends Omit<React.HTMLAttributes<HTMLLIElement>, 'title'> {
  title: React.ReactNode
  timestamp?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error'
}

const dotVariant = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
} as const

export function TimelineItem({ title, timestamp, variant = 'default', className, ...props }: TimelineItemProps) {
  return (
    <li className={cn('flex items-start gap-3', className)} {...props}>
      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', dotVariant[variant])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{title}</p>
        {timestamp && <p className="text-xs text-muted-foreground">{timestamp}</p>}
      </div>
    </li>
  )
}
