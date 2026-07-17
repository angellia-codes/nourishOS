import * as React from 'react'
import { cn } from '@/lib/utils'

// Controlled tabs with roving-tabindex arrow-key nav per WAI-ARIA tabs pattern (COMPONENT_LIBRARY.md §21 keyboard nav).
export interface TabItem {
  value: string
  label: React.ReactNode
}

export interface TabsProps {
  items: TabItem[]
  value: string
  onValueChange: (value: string) => void
  className?: string
}

export function Tabs({ items, value, onValueChange, className }: TabsProps) {
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({})

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const nextIndex = e.key === 'ArrowRight' ? (index + 1) % items.length : (index - 1 + items.length) % items.length
    const next = items[nextIndex]
    onValueChange(next.value)
    refs.current[next.value]?.focus()
  }

  return (
    <div role="tablist" aria-orientation="horizontal" className={cn('flex gap-1 border-b border-border', className)}>
      {items.map((item, index) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[item.value] = el
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(item.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'border-b-2 px-4 py-2.5 text-sm font-medium transition-colors duration-200',
              selected
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({
  value,
  activeValue,
  children,
}: {
  value: string
  activeValue: string
  children: React.ReactNode
}) {
  if (value !== activeValue) return null
  return (
    <div role="tabpanel" tabIndex={0}>
      {children}
    </div>
  )
}
