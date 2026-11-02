import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode, type TouchEvent } from 'react'
import type { BookPage, Spread } from '../bibleBook'
import type { Flip, Layout } from './useBookNavigation'

interface BookProps {
  layout: Layout
  pages: BookPage[]
  spreads: Spread[]
  position: number
  currentKey: string
  flip: Flip | null
  reducedMotion: boolean
  renderPage: (page: BookPage) => ReactNode
  onPrev: () => void
  onNext: () => void
  /** Asked after each render; true means "a turn just landed — focus the heading". */
  consumeFocusRequest: () => boolean
  edgeTabs?: ReactNode
  children?: ReactNode // the cover overlay while closed
  /** True while only the cover shows (before the opening plays). */
  closed: boolean
}

const SWIPE_PX = 48

/** Page-block edge width: 2px for a thin block, up to 9px for a thick one. */
const edgeWidth = (leaves: number) => Math.min(9, 2 + leaves * 0.4)

/**
 * The open book (design guide §4–§7). Only the visible spread and the pages
 * in flight are mounted (§7.5); everything else does not exist in the DOM,
 * which also keeps non-current pages out of the accessibility tree (§9).
 */
export function Book(props: BookProps) {
  const { layout, pages, spreads, position, flip, reducedMotion, renderPage } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    if (!props.consumeFocusRequest()) return
    const heading = rootRef.current?.querySelector<HTMLElement>(`[data-page-key="${props.currentKey}"] [data-page-heading]`)
    heading?.focus({ preventScroll: true })
  })

  const frame = (page: BookPage | null, side: 'left' | 'right', extra = '', style?: CSSProperties) => {
    const cls = `bible-page is-${side} ${page?.type === 'back' ? 'no-gutter' : ''} ${extra}`
    if (!page) return <div key={`${side}-blank-${extra}`} className={`${cls} is-blank`} style={style} aria-hidden="true" />
    return (
      <div key={`${page.key}-${extra}`} className={cls} style={style} data-page-key={extra ? undefined : page.key}>
        {renderPage(page)}
      </div>
    )
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement).closest('input, textarea, select')) return
    if (event.key === 'ArrowRight') props.onNext()
    if (event.key === 'ArrowLeft') props.onPrev()
  }
  const onTouchStart = (event: TouchEvent) => {
    touchX.current = event.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchX.current
    touchX.current = null
    const end = event.changedTouches[0]?.clientX
    if (start === null || end === undefined) return
    if (end - start > SWIPE_PX) props.onPrev()
    if (start - end > SWIPE_PX) props.onNext()
  }

  let content: ReactNode
  if (layout === 'spread') {
    const current = spreads[position] ?? [null, null]
    if (!flip) {
      content = [frame(current[0], 'left'), frame(current[1], 'right')]
    } else {
      const from = spreads[flip.from]
      const to = spreads[flip.to]
      const lead = flip.riffle * flip.stagger
      const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties
      if (reducedMotion) {
        content = [frame(from[0], 'left'), frame(from[1], 'right'), frame(to[0], 'left', 'bible-flip fade-in'), frame(to[1], 'right', 'bible-flip fade-in')]
      } else if (flip.dir === 1) {
        content = [
          frame(from[0], 'left'),
          frame(to[1], 'right'),
          ...Array.from({ length: flip.riffle }, (_, i) => frame(null, 'right', `bible-flip riffle-fwd r${i}`, delay((i + 1) * flip.stagger))),
          frame(from[1], 'right', 'bible-flip fwd-out'),
          frame(to[0], 'left', 'bible-flip fwd-in', delay(lead)),
        ]
      } else {
        content = [
          frame(to[0], 'left'),
          frame(from[1], 'right'),
          ...Array.from({ length: flip.riffle }, (_, i) => frame(null, 'left', `bible-flip riffle-back r${i}`, delay((i + 1) * flip.stagger))),
          frame(from[0], 'left', 'bible-flip back-out'),
          frame(to[1], 'right', 'bible-flip back-in', delay(lead)),
        ]
      }
    }
  } else {
    const current = pages[position]
    if (!flip) {
      content = frame(current ?? null, 'right')
    } else {
      const from = pages[flip.from]
      const to = pages[flip.to]
      if (reducedMotion) content = [frame(from, 'right'), frame(to, 'right', 'bible-flip fade-in')]
      else if (flip.dir === 1) content = [frame(to, 'right'), frame(from, 'right', 'bible-flip phone-out')]
      else content = [frame(from, 'right'), frame(to, 'right', 'bible-flip phone-in')]
    }
  }

  // The back cover is alone on the last spread; centre it like the closed front cover.
  const last = spreads.length - 1
  const atBack = layout === 'spread' && position === last && !flip
  const closed = props.closed
  const thickness = (
    <>
      <div className={`bible-board is-left ${closed ? 'is-off' : ''}`} aria-hidden="true" />
      <div className={`bible-board is-right ${atBack ? 'is-off' : ''}`} aria-hidden="true" />
      <div
        className={`bible-edge-stack is-left ${closed || atBack || position < 1 ? 'is-off' : ''}`}
        style={{ left: -edgeWidth(position), width: edgeWidth(position) }}
        aria-hidden="true"
      />
      <div
        className={`bible-edge-stack is-right ${closed || atBack ? 'is-off' : ''}`}
        style={{ width: edgeWidth(last - position) }}
        aria-hidden="true"
      />
    </>
  )

  return (
    <div
      ref={rootRef}
      className={`bible-book ${closed ? 'is-closed' : ''} ${atBack ? 'is-at-back' : ''}`}
      data-layout={layout}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {props.edgeTabs}
      {layout === 'spread' && thickness}
      {content}
      {props.children}
    </div>
  )
}
