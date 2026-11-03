import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { CHAPTERS, type BookPage, type ChapterId, type PageType, type SectionId } from './bibleBook'
import { useReader } from './readerContext'
import { CHAPTER_SHORT, CHAPTER_TITLES, PAGE_TITLES, S, SECTION_TITLES, t, type Lang } from './strings'

/** Page types worth a tab; openers, endpapers and the like are reached by Next or Contents. */
const TAB_TYPES: PageType[] = ['profile', 'grooming', 'holidays', 'forms', 'menu', 'sequence', 'picture', 'recipe', 'procedure', 'sop']
/** Pages without a tab of their own light up the tab they belong to (§6 "page type always shows as active"). */
const TAB_OF: Partial<Record<PageType, PageType>> = { category: 'menu', dish: 'menu', notes: 'menu' }

export function useCurrentContext(page: BookPage) {
  return { chapter: page.chapter, section: page.section }
}

/** "A. Floor", "B. Cashier" — the section's letter within its chapter. */
export function sectionLabel(section: SectionId, lang: Lang) {
  const chapter = CHAPTERS.find((c) => c.sections.includes(section))
  const letter = String.fromCharCode(65 + (chapter?.sections.indexOf(section) ?? 0))
  return `${letter}. ${t(SECTION_TITLES[section], lang)}`
}

/** "3. F&B Product" — mono amber label for the current chapter. */
export function chapterLabel(chapter: ChapterId | null, lang: Lang) {
  const def = CHAPTERS.find((c) => c.id === chapter)
  return def ? `${def.numeral}. ${t(CHAPTER_TITLES[def.id], lang)}` : ''
}

/** Chapter folder tabs in a row — phone and tablet (design guide §4.3–4.4). */
export function ChapterTabs({ current }: { current: ChapterId | null }) {
  const { lang, pages, goTo } = useReader()
  return (
    <div className="bible-folder-tabs" role="group" aria-label={t(S.chapters, lang)}>
      {CHAPTERS.map((chapter) => {
        const target = pages.find((p) => p.key === `${chapter.id}.opener`)
        return (
          <button
            key={chapter.id}
            type="button"
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

/**
 * Desktop thumb index (§4.2). Each tab sits behind the boards on the right
 * edge until the reader reaches its chapter, then slides to the left edge.
 */
export function EdgeTabs({ current, position }: { current: ChapterId | null; position: number }) {
  const { lang, spreads, goTo } = useReader()
  return (
    <div className="max-xl:hidden">
      {CHAPTERS.map((chapter, i) => {
        const key = `${chapter.id}.opener`
        const start = spreads.findIndex((s) => s.some((p) => p?.key === key))
        if (start < 0) return null
        const side = position >= start ? 'is-left' : 'is-right'
        return (
          <button
            key={chapter.id}
            type="button"
            className={`bible-edge-tab ${side}`}
            style={{ top: 30 + i * 76 }}
            aria-current={current === chapter.id ? 'true' : undefined}
            onClick={() => goTo(key)}
          >
            <span className="bible-mono tabular">{String(chapter.numeral).padStart(2, '0')}</span>
            <span className="bible-edge-tab-label">{t(CHAPTER_TITLES[chapter.id], lang)}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Section pills (A. Floor, B. Cashier…). On phone, a chapter without sections shows its own name (§6). */
export function SectionTabs({ chapter, section, compact = false }: { chapter: ChapterId | null; section: SectionId | null; compact?: boolean }) {
  const { lang, pages, goTo } = useReader()
  const def = CHAPTERS.find((c) => c.id === chapter)
  if (!def) return null
  if (def.sections.length === 0) {
    return compact ? <span className="bible-chapter-label">{chapterLabel(def.id, lang)}</span> : null
  }
  return (
    <>
      {def.sections.map((id) => {
        const target = pages.find((p) => p.section === id)
        if (!target) return null
        return (
          <button key={id} type="button" className="bible-pill" aria-current={section === id ? 'true' : undefined} onClick={() => goTo(target.key)}>
            {sectionLabel(id, lang)}
          </button>
        )
      })}
    </>
  )
}

/** Underlined page-type tabs for the current section, or the General Information pages. */
export function PageTabs({ page }: { page: BookPage }) {
  const { lang, pages, goTo } = useReader()
  const tabs = pages.filter((p) => TAB_TYPES.includes(p.type) && p.chapter === page.chapter && p.section === page.section)
  if (tabs.length === 0) return null
  const activeType = TAB_OF[page.type] ?? page.type
  return (
    <>
      {tabs.map((p) => (
        <button key={p.key} type="button" className="bible-text-tab" aria-current={p.type === activeType ? 'true' : undefined} onClick={() => goTo(p.key)}>
          {t(PAGE_TITLES[p.type], lang)}
        </button>
      ))}
    </>
  )
}

/** Desktop: one row — chapter label, section pills, a divider, page-type tabs (§4.2). */
export function DesktopNavRow({ page }: { page: BookPage }) {
  const { lang } = useReader()
  const hasSections = (CHAPTERS.find((c) => c.id === page.chapter)?.sections.length ?? 0) > 0
  return (
    <nav className="bible-nav-row" aria-label={t(S.sections, lang)}>
      <span className="bible-chapter-label">{chapterLabel(page.chapter, lang)}</span>
      <SectionTabs chapter={page.chapter} section={page.section} />
      {hasSections && <span className="bible-nav-divider" aria-hidden="true" />}
      <PageTabs page={page} />
    </nav>
  )
}

/** Phone and tablet: chapter folder tabs, section pills, page-type tabs (§4.4). */
export function CompactNav({ page }: { page: BookPage }) {
  const { lang } = useReader()
  return (
    <>
      <nav aria-label={t(S.chapters, lang)}>
        <ChapterTabs current={page.chapter} />
      </nav>
      <nav className="bible-scroll-row" aria-label={t(S.sections, lang)}>
        <SectionTabs chapter={page.chapter} section={page.section} compact />
      </nav>
      <nav className="bible-scroll-row is-tight" aria-label={t(S.pagesInSection, lang)}>
        <PageTabs page={page} />
      </nav>
    </>
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
  const sub = (key: string, label: string) => {
    const target = pages.find((p) => p.key === key)
    return (
      target && (
        <button key={key} type="button" className="bible-contents-row is-sub" onClick={() => go(target.key)}>
          <span>{label}</span>
          <span className="bible-mono tabular">{target.number}</span>
        </button>
      )
    )
  }
  return (
    <>
      <div className="bible-scrim" onClick={onClose} aria-hidden="true" />
      <div className="bible-panel is-left" role="dialog" aria-modal="true" aria-label={t(S.contents, lang)} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <div className="bible-panel-head">
          <h2 className="bible-panel-title">{t(S.contents, lang)}</h2>
          <button ref={closeRef} type="button" className="bible-close-btn" aria-label={t(S.closeContents, lang)} onClick={onClose}>
            <X className="h-[22px] w-[22px]" aria-hidden="true" />
          </button>
        </div>
        <ul className="bible-panel-body">
          {CHAPTERS.map((chapter) => {
            const opener = pages.find((p) => p.key === `${chapter.id}.opener`)
            return (
              <li key={chapter.id}>
                {opener && (
                  <button type="button" className="bible-contents-row is-chapter" onClick={() => go(opener.key)}>
                    <span>{chapterLabel(chapter.id, lang)}</span>
                    <span className="bible-mono tabular">{opener.number}</span>
                  </button>
                )}
                {chapter.id === 'general' &&
                  pages.filter((p) => p.chapter === 'general' && p.type !== 'opener').map((p) => sub(p.key, t(PAGE_TITLES[p.type], lang)))}
                {chapter.sections.map((section) => {
                  const target = pages.find((p) => p.section === section)
                  return target && sub(target.key, sectionLabel(section, lang))
                })}
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
