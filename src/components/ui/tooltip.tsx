import * as React from 'react'
import { cn } from '@/lib/utils'

// CSS-only tooltip (group-hover/focus-within) — no popover positioning library needed at this scale.
export interface TooltipProps {
  content: string
  children: React.ReactElement
  side?: 'top' | 'bottom'
  className?: string
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const id = React.useId()

  return (
    <span className="group relative inline-flex">
      {React.cloneElement(children, { 'aria-describedby': id })}
      <span
        role="tooltip"
        id={id}
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-sm bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          className,
        )}
      >
        {content}
      </span>
    </span>
  )
}
