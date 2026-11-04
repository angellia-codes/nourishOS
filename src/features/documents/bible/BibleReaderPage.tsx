import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Book as BookIcon, BookOpen, ChevronLeft, ChevronRight, List } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useOutlet } from '@/hooks/useOutlet'
import { PERMISSIONS } from '@/constants'
import { useLanguageStore } from '@/store'
import type { BibleAccess, BibleEdition, BibleOutletMenu } from '@/types'
import { BIBLE_OUTLETS, buildBook, mergeOutletView, type SectionId } from './bibleBook'
import { getBibleAccess, getCurrentEdition, subscribeToOutletMenu } from './bibleService'
import { Book } from './book/Book'
import { PageView } from './book/pages'
import { useBookNavigation, type Layout } from './book/useBookNavigation'
import { CompactNav, ContentsPanel, DesktopNavRow, EdgeTabs } from './nav'
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
  // The app-wide EN/ID toggle (src/lib/i18n.ts); the in-book switch writes it too.
  const lang = useLanguageStore((s) => s.lang)
  const setLanguage = useLanguageStore((s) => s.setLang)
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
      .catch((error) => {
        console.error('Bible load failed', error)
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [attempt])

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
  const desktop = useMedia('(min-width: 1280px)')
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
  const numberedCount = useMemo(() => pages.filter((p) => p.number > 0).length, [pages])

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
  const atBack = layout === 'spread' && nav.position === nav.count - 1
  // §5.2 Cover: kraft, spine, dashed frame, NOURISH, title, subtitle, Pandan seal, company.
  const cover = phase !== 'open' && (
    <button type="button" className="bible-cover bible-kraft" onClick={openBook} aria-label={t(S.openBook, lang)}>
      <span className="bible-spine is-left" aria-hidden="true" />
      <span className="bible-kraft-frame" style={{ left: 40, right: 16, top: 16, bottom: 16 }} aria-hidden="true" />
      <span className="absolute inset-x-0 top-[62px] ml-10 mr-4 block text-center">
        <span className="bible-kraft-mark">NOURISH</span>
        <span className="mt-3.5 block text-[46px] font-extrabold leading-[1.04] tracking-[-0.015em]">
          Nourish&apos;s
          <br />
          Bible
        </span>
        <span className="mt-3.5 block text-[15px] font-semibold">{t(S.coverSub, lang)}</span>
      </span>
      <span className="bible-seal absolute bottom-[104px] left-[calc(50%+12px)] -ml-[38px]" aria-hidden="true">
        <BookOpen className="h-[34px] w-[34px]" strokeWidth={1.8} />
      </span>
      <span className="bible-mono absolute inset-x-0 bottom-[38px] ml-10 mr-4 block text-center text-[11px] font-semibold uppercase">
        {t(S.company, lang)}
      </span>
    </button>
  )

  return (
    <ReaderContext.Provider value={value}>
      <header className="bible-header">
        <button type="button" className="bible-icon-btn" aria-label={t(S.closeBook, lang)} onClick={() => navigate('/documents')}>
          <BookIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="min-w-0 flex-1">
          <span className="bible-eyebrow block">NOURISH</span>
          <span className="block truncate text-base font-bold leading-tight">{t(S.book, lang)}</span>
        </h1>
        {/* A wrapper, because .bible-icon-btn's display would override max-sm:hidden on the control itself. */}
        <div className="flex gap-3 max-sm:hidden">
          {can(PERMISSIONS.BIBLE_MANAGE_OUTLET_MENU) && (
            <button type="button" className="bible-icon-btn has-label" onClick={() => navigate('/documents/bible/outlet-menu')}>
              {t(S.manageOutletMenu, lang)}
            </button>
          )}
          {!ownOutlet && (
            <select
              className="bible-icon-btn has-label bible-select"
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
        </div>
        <button
          type="button"
          className={`bible-icon-btn ${desktop ? 'has-label' : ''}`}
          aria-label={t(S.contents, lang)}
          aria-expanded={panel === 'contents'}
          disabled={!interactive}
          onClick={() => open('contents')}
        >
          <List className="h-5 w-5" aria-hidden="true" />
          {desktop && <span>{t(S.contents, lang)}</span>}
        </button>
        <div className="bible-seg" role="group" aria-label={t(S.language, lang)}>
          {(['en', 'id'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* Rows keep their height while closed so the book doesn't jump when it opens. */}
      <div className={interactive ? '' : 'invisible'} aria-hidden={!interactive}>
        {desktop ? <DesktopNavRow page={nav.currentPage} /> : <CompactNav page={nav.currentPage} />}
      </div>

      <main className={`bible-stage ${phase === 'opening' ? 'is-opening' : ''}`}>
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
          closed={phase === 'closed'}
          edgeTabs={interactive && !atBack ? <EdgeTabs current={nav.currentPage.chapter} position={nav.position} /> : null}
        >
          {cover}
        </Book>
      </main>

      <footer className="bible-footer">
        {interactive ? (
          <>
            <button type="button" className="bible-round-btn" aria-label={t(S.prev, lang)} disabled={nav.position === 0} onClick={nav.prev}>
              <ChevronLeft className="h-[22px] w-[22px]" aria-hidden="true" />
            </button>
            <p className="bible-counter bible-mono tabular" aria-hidden="true">
              {fill(t(S.counter, lang), { n: nav.announcement || '–', total: numberedCount })}
            </p>
            <button type="button" className="bible-round-btn" aria-label={t(S.next, lang)} disabled={nav.position >= nav.count - 1} onClick={nav.next}>
              <ChevronRight className="h-[22px] w-[22px]" aria-hidden="true" />
            </button>
          </>
        ) : (
          <p className="bible-hint">{t(S.openHint, lang)}</p>
        )}
      </footer>

      <div className="bible-sr-only" aria-live="polite">
        {nav.announcement && fill(t(S.page, lang), { n: nav.announcement, total: numberedCount })}
      </div>

      {panel === 'contents' && <ContentsPanel onClose={closePanel} />}
      {panel === 'search' && <SearchPanel section={section} onClose={closePanel} onPick={pick} />}
    </ReaderContext.Provider>
  )
}
