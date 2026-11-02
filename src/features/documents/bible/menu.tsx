import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { BibleMenuCategory } from '@/types'
import { SECTION_OWNERS, formatPrices, searchMenu, type SectionId } from './bibleBook'
import { useReader } from './readerContext'
import { S, SECTION_TITLES, fill, t } from './strings'

/** Design guide §6: the chosen category stays visible, scrolling the bar if needed. */
export function CategoryBar({
  categories,
  activeId,
  onChoose,
}: {
  categories: BibleMenuCategory[]
  activeId: string | null
  onChoose: (category: BibleMenuCategory) => void
}) {
  const activeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [activeId])
  return (
    <div className="bible-catbar" role="group">
      {categories.map((c) => (
        <button
          key={c.id}
          ref={c.id === activeId ? activeRef : undefined}
          type="button"
          aria-current={c.id === activeId ? 'true' : undefined}
          onClick={() => onChoose(c)}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Design guide §6.1. Runs on the device against the loaded edition (PRD §5.2),
 * scoped to the section the reader is in, so Bar never returns Kitchen dishes.
 */
export function SearchPanel({
  section,
  onClose,
  onPick,
}: {
  section: SectionId | null
  onClose: () => void
  onPick: (itemId: string, categoryId: string, group: 'food' | 'beverage') => void
}) {
  const { lang, items, categoriesById } = useReader()
  const [query, setQuery] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])
  const owners = section ? SECTION_OWNERS[section] : (['kitchen', 'bar', 'bakery'] as const)
  const results = useMemo(() => searchMenu(items, categoriesById, query, [...owners]), [items, categoriesById, query, owners])

  return (
    <>
      <div className="bible-scrim" onClick={onClose} aria-hidden="true" />
      <div
        className="bible-panel is-right"
        role="dialog"
        aria-modal="true"
        aria-label={t(S.search, lang)}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="flex items-center gap-2 p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden="true" />
            <input
              ref={input}
              className="bible-search-input pl-9"
              type="search"
              value={query}
              placeholder={t(S.searchHint, lang)}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="button" className="bible-icon-btn" aria-label={t(S.close, lang)} onClick={onClose}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p className="bible-mono px-4 pb-2 text-xs font-semibold" style={{ color: 'var(--bible-amber)' }}>
          {fill(t(S.searchingIn, lang), { scope: section ? t(SECTION_TITLES[section], lang) : t(S.book, lang) })}
        </p>
        <ul className="flex-1 overflow-y-auto">
          {query.trim() && results.length === 0 && <li className="px-4 py-3 text-sm">{t(S.noResults, lang)}</li>}
          {results.map((item) => {
            const category = categoriesById.get(item.categoryId)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="bible-panel-row"
                  onClick={() => category && onPick(item.id, category.id, category.group)}
                >
                  <span className="flex-1">
                    <span className="block font-semibold">{item.name}</span>
                    <span className="block text-xs" style={{ color: 'var(--bible-cream-soft)' }}>
                      {category?.label}
                    </span>
                  </span>
                  <span className="bible-mono tabular text-xs">{formatPrices(item.prices)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
