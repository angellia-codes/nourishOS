import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { CHAPTERS, type BookPage, type ChapterId, type PageType, type SectionId } from './bibleBook'
import { useReader } from './readerContext'
import { CHAPTER_SHORT, CHAPTER_TITLES, PAGE_TITLES, S, SECTION_TITLES, t } from './strings'

/** Page types worth a tab; openers, endpapers and the like are reached by Next or Contents. */
const TAB_TYPES: PageType[] = ['grooming', 'forms', 'menu', 'sequence', 'picture', 'recipe', 'procedure', 'sop']

export function useCurrentContext(page: BookPage) {
  return { chapter: page.chapter, section: page.section }
}

/** Chapter tabs in a row — phone and tablet (design guide §4.3–4.4). */
export function ChapterTabs({ current }: { current: ChapterId | null }) {
  const { lang, pages, goTo } = useReader()
  return (
    <div className="bible-scroll-row xl:hidden" role="group" aria-label={t(S.chapter, lang)}>
      {CHAPTERS.map((chapter) => {
        const target = pages.find((p) => p.key === `${chapter.id}.opener`)
        return (
          <button
            key={chapter.id}
            type="button"
            className="bible-pill"
            aria-current={current === chapter.id ? 'true' : undefined}
            onClick={() => target && goTo(target.key)}
          >
            {t(CHAPTER_SHORT[chapter.id], lang)}
          </button>
        )
      })}
    </div>
  )
}

/** Desktop thumb-index tabs sticking out of the book's edge (§4.2). Chapters 1–2 left, 3–4 right. */
export function EdgeTabs({ current }: { current: ChapterId | null }) {
  const { lang, pages, goTo } = useReader()
  const side = (ids: ChapterId[], cls: 'is-left' | 'is-right') => (
    <div className={`bible-edge ${cls} max-xl:hidden`}>
      {CHAPTERS.filter((c) => ids.includes(c.id)).map((chapter) => {
        const target = pages.find((p) => p.key === `${chapter.id}.opener`)
        return (
          <button
            key={chapter.id}
            type="button"
            className="bible-edge-tab"
            aria-current={current === chapter.id ? 'true' : undefined}
            onClick={() => target && goTo(target.key)}
          >
            <span className="bible-mono tabular">{String(chapter.numeral).padStart(2, '0')}</span>
            {t(CHAPTER_SHORT[chapter.id], lang)}
          </button>
        )
      })}
    </div>
  )
  return (
    <>
      {side(['general', 'service'], 'is-left')}
      {side(['product', 'wholefood'], 'is-right')}
    </>
  )
}

/** Section pills (Floor/Cashier, Kitchen/Bar/Bakery); a chapter without sections shows its own name (§6). */
export function SectionTabs({ chapter, section }: { chapter: ChapterId | null; section: SectionId | null }) {
  const { lang, pages, goTo } = useReader()
  const def = CHAPTERS.find((c) => c.id === chapter)
  if (!def) return null
  if (def.sections.length === 0) {
    return (
      <div className="bible-scroll-row">
        <span className="bible-pill" aria-current="true">
          {t(CHAPTER_TITLES[def.id], lang)}
        </span>
      </div>
    )
  }
  return (
    <div className="bible-scroll-row" role="group">
      {def.sections.map((id, i) => {
        const target = pages.find((p) => p.section === id)
        if (!target) return null
        return (
          <button key={id} type="button" className="bible-pill" aria-current={section === id ? 'true' : undefined} onClick={() => goTo(target.key)}>
            {String.fromCharCode(65 + i)}. {t(SECTION_TITLES[id], lang)}
          </button>
        )
      })}
    </div>
  )
}

/** Page-type tabs for the current section, or Grooming/Forms in General Information. */
export function PageTabs({ page }: { page: BookPage }) {
  const { lang, pages, goTo } = useReader()
  const tabs = pages.filter((p) => TAB_TYPES.includes(p.type) && p.chapter === page.chapter && p.section === page.section)
  // Picture and Dish share a slot; label the Floor/Cashier one "Dish" (design guide §5.3).
  if (tabs.length === 0) return null
  return (
    <div className="bible-scroll-row" role="group">
      {tabs.map((p) => (
        <button key={p.key} type="button" className="bible-text-tab" aria-current={p.key === page.key ? 'true' : undefined} onClick={() => goTo(p.key)}>
          {t(PAGE_TITLES[p.type], lang)}
        </button>
      ))}
    </div>
  )
}

/** Slides from the left; Escape closes and the caller restores focus (§9). */
export function ContentsPanel({ onClose }: { onClose: () => void }) {
  const { lang, pages, goTo } = useReader()
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => closeRef.current?.focus(), [])
  const go = (key: string) => {
    goTo(key)
    onClose()
  }
  return (
    <>
      <div className="bible-scrim" onClick={onClose} aria-hidden="true" />
      <div className="bible-panel is-left" role="dialog" aria-modal="true" aria-label={t(S.contents, lang)} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <div className="flex items-center justify-between p-3 pl-4">
          <h2 className="text-lg font-bold">{t(S.contents, lang)}</h2>
          <button ref={closeRef} type="button" className="bible-icon-btn" aria-label={t(S.close, lang)} onClick={onClose}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto pb-6">
          {CHAPTERS.map((chapter) => {
            const opener = pages.find((p) => p.key === `${chapter.id}.opener`)
            return (
              <li key={chapter.id}>
                {opener && (
                  <button type="button" className="bible-panel-row font-bold" onClick={() => go(opener.key)}>
                    <span className="bible-mono w-5" style={{ color: 'var(--bible-amber)' }}>
                      {chapter.numeral}
                    </span>
                    <span className="flex-1">{t(CHAPTER_TITLES[chapter.id], lang)}</span>
                    <span className="bible-mono tabular text-xs">{opener.number}</span>
                  </button>
                )}
                {chapter.sections.map((section) => {
                  const target = pages.find((p) => p.section === section)
                  return (
                    target && (
                      <button key={section} type="button" className="bible-panel-row pl-12" onClick={() => go(target.key)}>
                        <span className="flex-1">{t(SECTION_TITLES[section], lang)}</span>
                        <span className="bible-mono tabular text-xs">{target.number}</span>
                      </button>
                    )
                  )
                })}
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
