import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, ChevronLeft, ChevronRight, List } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useOutlet } from '@/hooks/useOutlet'
import { PERMISSIONS } from '@/constants'
import type { BibleAccess, BibleEdition, BibleOutletMenu } from '@/types'
import { BIBLE_OUTLETS, buildBook, mergeOutletView, type SectionId } from './bibleBook'
import { getBibleAccess, getCurrentEdition, subscribeToOutletMenu } from './bibleService'
import { Book } from './book/Book'
import { PageView } from './book/pages'
import { useBookNavigation, type Layout } from './book/useBookNavigation'
import { ChapterTabs, ContentsPanel, EdgeTabs, PageTabs, SectionTabs } from './nav'
import { SearchPanel } from './menu'
import { ReaderContext, type SectionSelection } from './readerContext'
import { S, STORAGE, fill, safeGet, safeSet, t, todayWita, type Lang } from './strings'
import './bible.css'

const SECTIONS: SectionId[] = ['floor', 'cashier', 'kitchen', 'bar', 'bakery']
const EMPTY_SELECTION: SectionSelection = { categoryId: null, itemId: null, group: 'food' }
const OPENING_MS = 1400

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatches(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return matches
}

/**
 * /documents/bible — the immersive reader (nourish-bible.md §4, design guide).
 * Rendered outside the app layout; still behind ProtectedRoute. Loading is the
 * access callable, the compiled edition and one outlet doc (§6.1).
 */
export function BibleReaderPage() {
  const [lang, setLang] = useState<Lang>(() => (safeGet(STORAGE.lang) === 'id' ? 'id' : 'en'))
  const [edition, setEdition] = useState<BibleEdition | null | undefined>(undefined) // undefined = loading
  const [access, setAccess] = useState<BibleAccess | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setFailed(false)
    Promise.all([getCurrentEdition(), getBibleAccess()])
      .then(([e, a]) => {
        if (!alive) return
        setEdition(e)
        setAccess(a)
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [attempt])

  const setLanguage = (next: Lang) => {
    setLang(next)
    safeSet(STORAGE.lang, next)
  }

  const shell = (children: React.ReactNode) => (
    <div className="bible-root" lang={lang}>
      {children}
    </div>
  )

  if (failed) {
    return shell(
      <div className="m-auto flex max-w-sm flex-col items-center gap-4 p-6 text-center">
        <p>{t(S.noSignal, lang)}</p>
        <button type="button" className="bible-pill" onClick={() => setAttempt((n) => n + 1)}>
          {t(S.retry, lang)}
        </button>
      </div>,
    )
  }
  if (edition === undefined || !access) {
    return shell(
      <div className="m-auto flex flex-col items-center gap-3" role="status" aria-label="Loading">
        <div className="bible-kraft bible-skeleton" style={{ width: 200, height: 270, borderRadius: 12 }} />
      </div>,
    )
  }
  if (edition === null) {
    return shell(
      <div className="m-auto flex max-w-sm flex-col items-center gap-2 p-6 text-center">
        <h1 className="text-xl font-bold">{t(S.notPublished, lang)}</h1>
        <p>{t(S.notPublishedBody, lang)}</p>
      </div>,
    )
  }
  return shell(<Reader edition={edition} access={access} lang={lang} setLang={setLanguage} />)
}

function Reader({ edition, access, lang, setLang }: { edition: BibleEdition; access: BibleAccess; lang: Lang; setLang: (l: Lang) => void }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { can } = usePermissions()
  const { outletId } = useOutlet()
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)')
  const wide = useMedia('(min-width: 1024px)')
  const layout: Layout = wide ? 'spread' : 'single'

  // §5.3 — a restaurant's staff see their outlet; everyone else the master menu, filterable.
  const ownOutlet = outletId && (BIBLE_OUTLETS as readonly string[]).includes(outletId) ? outletId : null
  const [filterOutlet, setFilterOutlet] = useState<string | null>(null)
  const viewOutlet = ownOutlet ?? filterOutlet
  const [outletMenu, setOutletMenu] = useState<BibleOutletMenu | null>(null)
  useEffect(() => {
    setOutletMenu(null)
    if (!viewOutlet) return
    return subscribeToOutletMenu(viewOutlet, setOutletMenu, () => setOutletMenu(null))
  }, [viewOutlet])

  const items = useMemo(() => mergeOutletView(edition.items, viewOutlet ? outletMenu : null), [edition.items, outletMenu, viewOutlet])
  const categoriesById = useMemo(() => new Map(edition.categories.map((c) => [c.id, c])), [edition.categories])
  const { spreads, pages } = useMemo(() => buildBook(access.menuOnly), [access.menuOnly])

  // §7.4 — the cover plays on the first open of the Makassar day; a deep link skips it.
  const deepLink = params.get('page')
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>(() => {
    const first = safeGet(STORAGE.lastOpenedDate) !== todayWita()
    return first && !deepLink ? 'closed' : 'open'
  })
  const initialKey = useMemo(() => deepLink ?? (phase === 'open' ? safeGet(STORAGE.lastPageKey) : null) ?? 'title', []) // eslint-disable-line react-hooks/exhaustive-deps
  const nav = useBookNavigation({ pages, spreads, layout, initialKey, reducedMotion })

  const openBook = () => {
    safeSet(STORAGE.lastOpenedDate, todayWita())
    if (reducedMotion) return setPhase('open')
    setPhase('opening')
    window.setTimeout(() => setPhase('open'), OPENING_MS)
  }
  useEffect(() => {
    if (phase === 'open') safeSet(STORAGE.lastOpenedDate, todayWita())
  }, [phase])

  const [selection, setSelection] = useState<Record<SectionId, SectionSelection>>(() =>
    Object.fromEntries(SECTIONS.map((s) => [s, EMPTY_SELECTION])) as Record<SectionId, SectionSelection>,
  )
  const select = useCallback((section: SectionId, patch: Partial<SectionSelection>) => {
    setSelection((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }))
  }, [])

  const [panel, setPanel] = useState<'contents' | 'search' | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const open = (which: 'contents' | 'search') => {
    opener.current = document.activeElement as HTMLElement
    setPanel(which)
  }
  const closePanel = () => {
    setPanel(null)
    opener.current?.focus()
  }

  const section = nav.currentPage.section
  const pick = (itemId: string, categoryId: string, group: 'food' | 'beverage') => {
    const target = section ?? 'floor'
    select(target, { itemId, categoryId, group })
    closePanel()
    nav.goTo(target === 'floor' || target === 'cashier' ? `service.${target}.dish` : `product.${target}.picture`)
  }

  const value = {
    lang,
    edition,
    items,
    categories: edition.categories,
    categoriesById,
    access,
    pages,
    spreads,
    goTo: nav.goTo,
    selection,
    select,
    openSearch: () => open('search'),
    canPublishForms: can(PERMISSIONS.DOCUMENTS_PUBLISH),
  }

  const interactive = phase === 'open'
  const cover = phase !== 'open' && (
    <button type="button" className="bible-cover bible-kraft flex flex-col items-center justify-center gap-4" onClick={openBook} aria-label={`${t(S.book, lang)} — ${t(S.openHint, lang)}`}>
      <span className="bible-kraft-frame" />
      <span className="text-5xl font-extrabold tracking-tight">NOURISH.</span>
      <span className="text-xl font-bold">{t(S.book, lang)}</span>
      <span className="bible-seal">N</span>
      <span className="bible-mono text-xs font-semibold">{t(S.openHint, lang)}</span>
    </button>
  )

  return (
    <ReaderContext.Provider value={value}>
      <header className="flex min-h-16 items-center gap-2 px-3">
        <button type="button" className="bible-icon-btn" aria-label={t(S.closeBook, lang)} onClick={() => navigate('/documents')}>
          <BookOpen className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="flex-1 truncate text-base font-bold" style={{ color: 'var(--bible-paper)' }}>
          <span className="bible-mono text-xs" style={{ color: 'var(--bible-amber)' }}>
            NOURISH /{' '}
          </span>
          {t(S.book, lang)}
        </h1>
        {can(PERMISSIONS.BIBLE_MANAGE_OUTLET_MENU) && (
          <button type="button" className="bible-pill max-sm:hidden" onClick={() => navigate('/documents/bible/outlet-menu')}>
            {t(S.manageOutletMenu, lang)}
          </button>
        )}
        {!ownOutlet && (
          <select
            className="bible-pill max-sm:hidden"
            style={{ background: 'transparent' }}
            aria-label={t(S.outletFilter, lang)}
            value={filterOutlet ?? ''}
            onChange={(e) => setFilterOutlet(e.target.value || null)}
          >
            <option value="">{t(S.allOutlets, lang)}</option>
            {BIBLE_OUTLETS.map((id) => (
              <option key={id} value={id}>
                {id.replace('nourish_', 'Nourish ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        )}
        <button type="button" className="bible-icon-btn" aria-label={t(S.contents, lang)} disabled={!interactive} onClick={() => open('contents')}>
          <List className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="bible-seg" role="group" aria-label="Language">
          {(['en', 'id'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {interactive && (
        <nav aria-label={t(S.book, lang)} className="flex flex-col gap-1 pb-1">
          <ChapterTabs current={nav.currentPage.chapter} />
          <SectionTabs chapter={nav.currentPage.chapter} section={section} />
          <PageTabs page={nav.currentPage} />
        </nav>
      )}

      <div className={`bible-stage ${phase === 'opening' ? 'is-opening' : ''}`}>
        <Book
          layout={layout}
          pages={pages}
          spreads={spreads}
          position={nav.position}
          currentKey={nav.currentKey}
          flip={nav.flip}
          reducedMotion={reducedMotion}
          renderPage={(page) => <PageView page={page} />}
          onPrev={interactive ? nav.prev : () => undefined}
          onNext={interactive ? nav.next : () => undefined}
          consumeFocusRequest={nav.consumeFocusRequest}
          className={phase === 'closed' ? 'is-closed' : ''}
          edgeTabs={interactive ? <EdgeTabs current={nav.currentPage.chapter} /> : null}
        >
          {cover}
        </Book>
      </div>

      <footer className="flex min-h-[68px] items-center justify-center gap-4">
        <button type="button" className="bible-icon-btn" aria-label={t(S.prev, lang)} disabled={!interactive || nav.position === 0} onClick={nav.prev}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <span className="bible-mono tabular text-sm font-semibold" style={{ color: 'var(--bible-paper)' }}>
          {fill(t(S.page, lang), { n: nav.announcement || '–', total: pages.length })}
        </span>
        <button type="button" className="bible-icon-btn" aria-label={t(S.next, lang)} disabled={!interactive || nav.position >= nav.count - 1} onClick={nav.next}>
          <ChevronRight className="h-6 w-6" aria-hidden="true" />
        </button>
      </footer>

      <div className="bible-sr-only" aria-live="polite">
        {fill(t(S.page, lang), { n: nav.announcement, total: pages.length })}
      </div>

      {panel === 'contents' && <ContentsPanel onClose={closePanel} />}
      {panel === 'search' && <SearchPanel section={section} onClose={closePanel} onPick={pick} />}
    </ReaderContext.Provider>
  )
}
