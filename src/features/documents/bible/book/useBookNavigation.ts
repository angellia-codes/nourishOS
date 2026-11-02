import { useCallback, useEffect, useRef, useState } from 'react'
import type { BookPage, Spread } from '../bibleBook'
import { safeSet, STORAGE } from '../strings'

export type Layout = 'spread' | 'single'

export interface Flip {
  /** Positions in the current layout's units (spread index or page index). */
  from: number
  to: number
  dir: 1 | -1
  /** Blank riffle leaves for a long jump (§7.3) — at most six. */
  riffle: number
  stagger: number
  durationMs: number
}

const TURN_MS = 400
const FADE_MS = 200
const MAX_RIFFLE = 6

/**
 * Position in the book, page turns, and the remembered page (design guide
 * §7.2–7.4). The page key is the source of truth, not an index, so switching
 * between spread and single layouts (a resize, a rotated phone) keeps the
 * reader on the same page.
 */
export function useBookNavigation(opts: {
  pages: BookPage[]
  spreads: Spread[]
  layout: Layout
  initialKey: string
  reducedMotion: boolean
}) {
  const { pages, spreads, layout, reducedMotion } = opts
  const [currentKey, setCurrentKey] = useState(() =>
    pages.some((p) => p.key === opts.initialKey) ? opts.initialKey : 'title',
  )
  const [flip, setFlip] = useState<Flip | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const timer = useRef<number>()
  const focusAfterTurn = useRef(false)

  // A key that vanished (menu-only access arrived, say) falls back to the title page.
  useEffect(() => {
    if (!pages.some((p) => p.key === currentKey)) setCurrentKey('title')
  }, [pages, currentKey])

  const positionOf = useCallback(
    (key: string) =>
      layout === 'spread'
        ? Math.max(0, spreads.findIndex((s) => s.some((p) => p?.key === key)))
        : Math.max(0, pages.findIndex((p) => p.key === key)),
    [layout, pages, spreads],
  )
  const position = positionOf(currentKey)
  const count = layout === 'spread' ? spreads.length : pages.length

  useEffect(() => {
    safeSet(STORAGE.lastPageKey, currentKey)
    const visible = layout === 'spread' ? (spreads[position] ?? []).filter(Boolean) : [pages[position]]
    const numbers = visible.map((p) => p?.number).filter(Boolean)
    setAnnouncement(numbers.join('–'))
  }, [currentKey, layout, pages, position, spreads])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const goTo = useCallback(
    (key: string) => {
      if (!pages.some((p) => p.key === key)) return
      const from = positionOf(currentKey)
      const to = positionOf(key)
      focusAfterTurn.current = true
      if (from === to || flip) {
        setCurrentKey(key)
        return
      }
      const dir = to > from ? 1 : -1
      const distance = Math.abs(to - from)
      const riffle = reducedMotion || layout === 'single' ? 0 : Math.min(distance - 1, MAX_RIFFLE)
      const stagger = riffle > 0 ? Math.min(55, 420 / riffle) : 0
      const durationMs = reducedMotion ? FADE_MS : TURN_MS + riffle * stagger
      setFlip({ from, to, dir, riffle, stagger, durationMs })
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        setCurrentKey(key)
        setFlip(null)
      }, durationMs)
    },
    [currentKey, flip, layout, pages, positionOf, reducedMotion],
  )

  const step = useCallback(
    (delta: 1 | -1) => {
      const target = position + delta
      if (target < 0 || target >= count) return
      const key =
        layout === 'spread'
          ? (spreads[target].find((p) => p !== null) as BookPage).key
          : pages[target].key
      goTo(key)
    },
    [count, goTo, layout, pages, position, spreads],
  )

  /** After a turn lands, focus the new page's heading (§9). */
  const consumeFocusRequest = useCallback(() => {
    const wanted = focusAfterTurn.current && !flip
    if (wanted) focusAfterTurn.current = false
    return wanted
  }, [flip])

  return {
    currentKey,
    currentPage: pages.find((p) => p.key === currentKey) ?? pages[0],
    position,
    count,
    flip,
    goTo,
    next: () => step(1),
    prev: () => step(-1),
    announcement,
    consumeFocusRequest,
  }
}
