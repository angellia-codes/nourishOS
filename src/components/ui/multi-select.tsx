import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Checkbox } from './checkbox'
import { Input } from './input'

export interface MultiSelectOption<T extends string> {
  value: T
  label: string
}

export interface MultiSelectProps<T extends string> {
  id?: string
  options: MultiSelectOption<T>[]
  value: T[]
  onChange: (next: T[]) => void
  /** Trigger text while nothing is picked — e.g. "All outlets" where empty means everyone. */
  emptyLabel: string
  /** Rendered only for long lists (more than 10 options). */
  searchPlaceholder?: string
}

const SEARCH_THRESHOLD = 10

/**
 * Checkbox list behind a Select-styled trigger. Native HTML, no popover
 * dependency: same anchored panel + full-page overlay button shape as
 * ChatBell/NotificationBell, so an outside click closes it.
 */
export function MultiSelect<T extends string>({
  id,
  options,
  value,
  onChange,
  emptyLabel,
  searchPlaceholder = 'Search…',
}: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  function close() {
    setOpen(false)
    setQuery('')
  }

  function toggle(option: T) {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option])
  }

  const picked = options.filter((option) => value.includes(option.value))
  const summary =
    picked.length === 0
      ? emptyLabel
      : picked.length <= 2
        ? picked.map((option) => option.label).join(', ')
        : `${picked.length} selected`

  const needle = query.trim().toLowerCase()
  const visible = needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options

  return (
    <div
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          close()
        }
      }}
    >
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className={cn(
          'relative flex h-12 w-full items-center rounded-md border border-border bg-sunken px-3 py-2 pr-9 text-left text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          picked.length === 0 ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close"
            tabIndex={-1}
            onClick={close}
          />
          <div className="absolute left-0 top-full z-40 mt-1 flex w-full min-w-[16rem] flex-col rounded-xl border border-border bg-surface shadow-dialog">
            {options.length > SEARCH_THRESHOLD && (
              <div className="border-b border-border p-2">
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                />
              </div>
            )}
            <div role="listbox" aria-multiselectable="true" className="flex max-h-72 flex-col gap-1 overflow-y-auto p-2">
              {visible.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">No matches.</p>
              ) : (
                visible.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-sunken"
                  >
                    <Checkbox checked={value.includes(option.value)} onChange={() => toggle(option.value)} />
                    {option.label}
                  </label>
                ))
              )}
            </div>
            <div className="flex justify-between gap-2 border-t border-border p-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])} disabled={value.length === 0}>
                Clear
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={close}>
                Done
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
