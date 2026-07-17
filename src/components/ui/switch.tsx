import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {}

// Checkbox-driven visual switch — peer-checked handles the toggle, no JS state needed.
export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(({ className, ...props }, ref) => (
  <label className={cn('relative inline-flex h-7 w-12 shrink-0 cursor-pointer', className)}>
    <input ref={ref} type="checkbox" role="switch" className="peer sr-only" {...props} />
    <span
      aria-hidden="true"
      className={cn(
        'absolute inset-0 rounded-full bg-border transition-colors duration-200',
        'peer-checked:bg-primary',
        'peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
      )}
    />
    <span
      aria-hidden="true"
      className={cn(
        'absolute left-1 top-1 h-5 w-5 rounded-full bg-surface shadow-card transition-transform duration-200',
        'peer-checked:translate-x-5',
      )}
    />
  </label>
))
Switch.displayName = 'Switch'
