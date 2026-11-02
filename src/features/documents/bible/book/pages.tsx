import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Lock, Search, Image as ImageIcon } from 'lucide-react'
import type { BibleMenuCategory, BibleMenuItem, DocumentResource, Sop } from '@/types'
import { subscribeToSops } from '../../sopLibrary/sopService'
import { subscribeToDocumentResources } from '../../resources/documentResourceService'
import { CHAPTERS, SECTION_OWNERS, SECTION_SOP_DEPARTMENTS, formatPrices, type BookPage, type SectionId } from '../bibleBook'
import { useReader, type SectionSelection } from '../readerContext'
import { CategoryBar } from '../menu'
import { S, CHAPTER_TITLES, OWNER_TEAMS, PAGE_TITLES, SECTION_TITLES, TAG_LABELS, fill, t, type Lang } from '../strings'

// ---- Frame ------------------------------------------------------------------

function Heading({ children, className = 'bible-h1' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={className} tabIndex={-1} data-page-heading>
      {children}
    </h2>
  )
}

/** §5.1 — running head, heading, scrolling body, dashed footer with NOURISH and the page number. */
function PageFrame({ page, children }: { page: BookPage; children: ReactNode }) {
  const { lang } = useReader()
  const chapter = CHAPTERS.find((c) => c.id === page.chapter)
  const left = chapter ? `${chapter.numeral}. ${t(CHAPTER_TITLES[chapter.id], lang)}` : t(S.book, lang)
  const right = page.section ? t(SECTION_TITLES[page.section], lang) : ''
  return (
    <>
      <div className="bible-page-head bible-mono" aria-hidden="true">
        <span className="truncate">{left}</span>
        <span className="truncate">{right}</span>
      </div>
      <div className="bible-page-body">{children}</div>
      <div className="bible-page-foot bible-mono" aria-hidden="true">
        <span>NOURISH</span>
        <span className="tabular">{page.number}</span>
      </div>
    </>
  )
}

function ComingSoon({ title, lang }: { title: string; lang: Lang }) {
  return (
    <>
      <Heading>{title}</Heading>
      <div className="mt-10 flex flex-col items-start gap-2">
        <span className="bible-chip bible-accent">{t(S.comingSoon, lang)}</span>
        <p className="bible-desc">{t(S.comingSoonBody, lang)}</p>
      </div>
    </>
  )
}

// ---- Section state helpers ---------------------------------------------------

/** What one section's menu shows right now: its categories, the chosen one, and the chosen dish (§5.4 slots). */
export function useSectionMenu(section: SectionId) {
  const { items, categories, selection } = useReader()
  return useMemo(() => {
    const owners = SECTION_OWNERS[section]
    const counts = new Map<string, number>()
    for (const item of items) if (owners.includes(item.owner)) counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1)
    const visible = categories.filter((c) => owners.includes(c.owner) && (counts.get(c.id) ?? 0) > 0)
    const groups = [...new Set(visible.map((c) => c.group))]
    const sel: SectionSelection = selection[section]
    const group = groups.includes(sel.group) ? sel.group : (groups[0] ?? 'food')
    const inGroup = visible.filter((c) => c.group === group)
    const category = inGroup.find((c) => c.id === sel.categoryId) ?? inGroup[0] ?? null
    const categoryItems = category ? items.filter((i) => i.categoryId === category.id) : []
    const item = items.find((i) => i.id === sel.itemId && owners.includes(i.owner)) ?? categoryItems[0] ?? null
    return { visible, groups, group, inGroup, category, categoryItems, item, counts }
  }, [categories, items, section, selection])
}

function GroupSwitch({ section, groups, group }: { section: SectionId; groups: string[]; group: string }) {
  const { lang, select } = useReader()
  if (groups.length < 2) return null
  return (
    <div className="bible-seg is-paper" role="group" aria-label={`${t(S.food, lang)} / ${t(S.beverage, lang)}`}>
      {(['food', 'beverage'] as const).map((g) => (
        <button key={g} type="button" aria-pressed={group === g} onClick={() => select(section, { group: g, categoryId: null, itemId: null })}>
          {t(g === 'food' ? S.food : S.beverage, lang)}
        </button>
      ))}
    </div>
  )
}

function SearchButton({ compact = false }: { compact?: boolean }) {
  const { lang, openSearch } = useReader()
  if (compact) {
    return (
      <button type="button" className="bible-icon-btn is-paper" aria-label={t(S.search, lang)} onClick={openSearch}>
        <Search className="h-5 w-5" aria-hidden="true" />
      </button>
    )
  }
  return (
    <button type="button" onClick={openSearch} className="bible-search-btn">
      <Search className="h-4 w-4" aria-hidden="true" />
      {t(S.search, lang)}
    </button>
  )
}

function Tags({ item, lang }: { item: BibleMenuItem; lang: Lang }) {
  if (item.tags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {item.tags.map((tag) => (
        <span key={tag} className="bible-chip">
          <span className="bible-mono">{tag}</span> {t(TAG_LABELS[tag], lang)}
        </span>
      ))}
    </div>
  )
}

// ---- Templates (design guide §5.2) ----------------------------------------------

function EndpaperPage({ page }: { page: BookPage }) {
  const { lang, edition } = useReader()
  const published = edition.publishedAt ? new Date(edition.publishedAt).toLocaleDateString('en-GB', { dateStyle: 'long' }) : ''
  return (
    <div className="bible-kraft relative flex h-full flex-col items-center justify-end p-10 text-center">
      <div className="bible-kraft-frame" />
      <Heading className="text-lg font-bold">{t(S.book, lang)}</Heading>
      <p className="bible-mono mt-2 text-xs font-semibold">
        {fill(t(S.edition, lang), { n: edition.editionNumber })}
        {published && ` · ${published}`}
      </p>
      <p className="bible-mono tabular mt-6 text-xs">{page.number}</p>
    </div>
  )
}

function TitlePage() {
  const { lang, edition } = useReader()
  const words = t(S.book, lang).split(' ')
  return (
    <div className="bible-pandan flex h-full flex-col justify-center p-7">
      <div className="bible-ticket">
        <p className="bible-mono text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--bible-amber)' }}>
          NOURISH
        </p>
        <h2 className="mt-3 text-[34px] font-bold leading-tight" tabIndex={-1} data-page-heading>
          {words.map((word, i) => (
            <span key={i} className="bible-word" style={{ ['--i' as string]: i }}>
              {word}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </h2>
        <span className="bible-chip bible-chip-in mt-4" style={{ borderColor: 'var(--bible-amber-dim)', color: 'var(--bible-amber)' }}>
          <span className="bible-mono">{fill(t(S.edition, lang), { n: edition.editionNumber })}</span>
        </span>
        <div className="bible-ticket-perf" />
        <p className="bible-note-in text-sm" style={{ color: 'var(--bible-cream-soft)' }}>
          {t(S.subtitle, lang)}
        </p>
      </div>
      <p className="bible-note-in bible-mono mt-6 text-center text-xs" style={{ color: 'var(--bible-cream-soft)' }}>
        {t(S.company, lang)}
      </p>
    </div>
  )
}

function ContentsPage({ page }: { page: BookPage }) {
  const { lang, pages, goTo } = useReader()
  return (
    <PageFrame page={page}>
      <Heading>{t(S.contents, lang)}</Heading>
      <ol className="mt-4">
        {CHAPTERS.map((chapter) => {
          const opener = pages.find((p) => p.key === `${chapter.id}.opener`)
          return (
            <li key={chapter.id}>
              {opener && (
                <button type="button" className="bible-row" onClick={() => goTo(opener.key)}>
                  <span className="bible-mono bible-accent w-6">{chapter.numeral}</span>
                  <span className="flex-1">{t(CHAPTER_TITLES[chapter.id], lang)}</span>
                  <span className="bible-mono tabular bible-muted">{opener.number}</span>
                </button>
              )}
              {chapter.sections.map((section, i) => {
                const target = pages.find((p) => p.section === section)
                if (!target) return null
                return (
                  <button key={section} type="button" className="bible-row pl-8 font-normal" onClick={() => goTo(target.key)}>
                    <span className="bible-mono bible-muted w-5">{String.fromCharCode(65 + i)}</span>
                    <span className="flex-1">{t(SECTION_TITLES[section], lang)}</span>
                    <span className="bible-mono tabular bible-muted">{target.number}</span>
                  </button>
                )
              })}
            </li>
          )
        })}
      </ol>
    </PageFrame>
  )
}

function OpenerPage({ page }: { page: BookPage }) {
  const { lang } = useReader()
  const chapter = CHAPTERS.find((c) => c.id === page.chapter)!
  return (
    <div className="bible-pandan flex h-full flex-col justify-end p-8">
      <span className="bible-numeral tabular" aria-hidden="true">
        {chapter.numeral}
      </span>
      <Heading className="bible-chapter-title mt-4">
        <span className="bible-sr-only">
          {t(S.chapter, lang)} {chapter.numeral}:{' '}
        </span>
        {t(CHAPTER_TITLES[chapter.id], lang)}
      </Heading>
      <p className="bible-mono tabular mt-6 text-xs" style={{ color: 'var(--bible-cream-soft)' }}>
        {page.number}
      </p>
    </div>
  )
}

function TocPage({ page }: { page: BookPage }) {
  const { lang, pages, goTo } = useReader()
  const chapter = CHAPTERS.find((c) => c.id === page.chapter)!
  return (
    <PageFrame page={page}>
      <Heading>{t(S.inThisChapter, lang)}</Heading>
      <div className="mt-4">
        {chapter.sections.map((section, i) => {
          const sectionPages = pages.filter((p) => p.section === section)
          if (sectionPages.length === 0) return null
          return (
            <div key={section} className="mb-3">
              <button type="button" className="bible-row" onClick={() => goTo(sectionPages[0].key)}>
                <span className="bible-mono bible-accent w-6">{String.fromCharCode(65 + i)}</span>
                <span className="flex-1">{t(SECTION_TITLES[section], lang)}</span>
                <span className="bible-mono tabular bible-muted">{sectionPages[0].number}</span>
              </button>
              <p className="bible-desc mt-1 pl-8">{sectionPages.map((p) => t(PAGE_TITLES[p.type], lang)).join(' · ')}</p>
            </div>
          )
        })}
      </div>
    </PageFrame>
  )
}

/** Grooming and Sequence of Service — bilingual BibleContent blocks, or Coming soon (§3 Phase 1). */
function ContentBlocksPage({ page, kind, scopes }: { page: BookPage; kind: 'grooming' | 'sequenceOfService'; scopes: string[] }) {
  const { lang, edition } = useReader()
  const blocks = edition.content.filter((c) => c.kind === kind && scopes.includes(c.scope))
  const title = t(PAGE_TITLES[page.type], lang)
  return (
    <PageFrame page={page}>
      {blocks.length === 0 ? (
        <ComingSoon title={title} lang={lang} />
      ) : (
        <>
          <Heading>{title}</Heading>
          {blocks.map((block) => (
            <section key={block.id} className="mt-4">
              <h3 className="text-base font-bold">{t(block.heading, lang)}</h3>
              <ol className="mt-2">
                {block.blocks.map((b, i) => (
                  <li key={i} className="bible-rule py-2">
                    <p className="text-sm font-semibold">
                      {kind === 'sequenceOfService' && <span className="bible-mono bible-accent tabular mr-2">{i + 1}</span>}
                      {t(b.label, lang)}
                    </p>
                    <p className="bible-desc">{t(b.body, lang)}</p>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </>
      )}
    </PageFrame>
  )
}

function FormsPage({ page }: { page: BookPage }) {
  const { lang, canPublishForms } = useReader()
  const navigate = useNavigate()
  const [forms, setForms] = useState<DocumentResource[] | null>(null)
  useEffect(() => subscribeToDocumentResources('form', setForms, () => setForms([])), [])
  return (
    <PageFrame page={page}>
      <div className="flex items-start justify-between gap-2">
        <Heading>{t(PAGE_TITLES.forms, lang)}</Heading>
        {canPublishForms && (
          <button type="button" className="bible-chip min-h-12 px-3" onClick={() => navigate('/documents/company-forms/new')}>
            {t(S.addForm, lang)}
          </button>
        )}
      </div>
      <div className="mt-3">
        {forms === null && <div className="bible-skeleton h-24" />}
        {forms?.length === 0 && <p className="bible-desc mt-4">{t(S.noForms, lang)}</p>}
        {forms?.map((form) => (
          <div key={form.id} className="bible-row">
            <a href={form.driveUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 flex-1 items-center gap-2">
              <span className="flex-1">
                {form.category && <span className="bible-mono bible-muted block text-[11px] uppercase">{form.category}</span>}
                {form.title}
              </span>
              <ExternalLink className="bible-muted h-4 w-4 shrink-0" aria-label={t(S.open, lang)} />
            </a>
            {canPublishForms && (
              <button type="button" className="bible-chip min-h-12 px-3" onClick={() => navigate(`/documents/company-forms/${form.id}/edit`)}>
                {t(S.edit, lang)}
              </button>
            )}
          </div>
        ))}
      </div>
    </PageFrame>
  )
}

function MenuPage({ page }: { page: BookPage }) {
  const { lang, select, goTo } = useReader()
  const section = page.section!
  const menu = useSectionMenu(section)
  return (
    <PageFrame page={page}>
      <Heading>{t(PAGE_TITLES.menu, lang)}</Heading>
      <div className="mt-3 flex flex-col gap-3">
        <SearchButton />
        <GroupSwitch section={section} groups={menu.groups} group={menu.group} />
        <div className="grid grid-cols-2 gap-2">
          {menu.inGroup.map((category) => (
            <button
              key={category.id}
              type="button"
              className="bible-card"
              onClick={() => {
                select(section, { categoryId: category.id, itemId: null, group: category.group })
                goTo(`${page.chapter}.${section}.category`)
              }}
            >
              <span className="text-[13.5px] font-semibold leading-tight">{category.label}</span>
              <span className="bible-mono bible-muted tabular text-[11px]">{fill(t(S.items, lang), { n: menu.counts.get(category.id) ?? 0 })}</span>
            </button>
          ))}
        </div>
        <p className="bible-mono bible-muted text-[11px]">{t(S.pricesInThousands, lang)}</p>
      </div>
    </PageFrame>
  )
}

function CategoryMeta({ category, lang }: { category: BibleMenuCategory; lang: Lang }) {
  if (!category.servingHours && !category.note) return null
  return (
    <div className="mt-1 flex flex-col gap-0.5">
      {category.servingHours && (
        <p className="bible-mono bible-accent text-[12px] font-semibold">{fill(t(S.servingHours, lang), { hours: category.servingHours })}</p>
      )}
      {category.note && <p className="bible-desc text-[13px]">{category.note}</p>}
    </div>
  )
}

function CategoryPage({ page }: { page: BookPage }) {
  const { lang, select, goTo } = useReader()
  const section = page.section!
  const menu = useSectionMenu(section)
  const category = menu.category
  const dishKey = `${page.chapter}.${section}.${page.chapter === 'service' ? 'dish' : 'picture'}`
  return (
    <PageFrame page={page}>
      <div className="flex items-start justify-between gap-2">
        <Heading>{category?.label ?? t(PAGE_TITLES.category, lang)}</Heading>
        <SearchButton compact />
      </div>
      {category && <CategoryMeta category={category} lang={lang} />}
      <div className="mt-2 flex flex-col gap-2">
        <GroupSwitch section={section} groups={menu.groups} group={menu.group} />
        <CategoryBar categories={menu.inGroup} activeId={category?.id ?? null} onChoose={(c) => select(section, { categoryId: c.id, itemId: null })} />
      </div>
      <ul className="mt-2">
        {menu.categoryItems.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="bible-row"
              onClick={() => {
                select(section, { itemId: item.id, categoryId: item.categoryId })
                goTo(dishKey)
              }}
            >
              <span className="flex-1">
                {item.name}
                {item.tags.length > 0 && <span className="bible-mono bible-muted ml-1.5 text-[11px]">{item.tags.join(' ')}</span>}
              </span>
              <span className="bible-mono tabular text-[13px]">{formatPrices(item.prices)}</span>
            </button>
          </li>
        ))}
      </ul>
    </PageFrame>
  )
}

/** Dish (Floor/Cashier) and Picture (Kitchen/Bar/Bakery) — the same slot (§5.4). */
function DishPage({ page }: { page: BookPage }) {
  const { lang, goTo, categoriesById } = useReader()
  const section = page.section!
  const { item } = useSectionMenu(section)
  const category = item ? categoriesById.get(item.categoryId) : null
  return (
    <PageFrame page={page}>
      {category && (
        <button type="button" className="bible-accent -ml-1 flex min-h-12 items-center gap-1 text-sm font-semibold" onClick={() => goTo(`${page.chapter}.${section}.category`)}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {fill(t(S.backTo, lang), { name: category.label })}
        </button>
      )}
      {!item ? (
        <>
          <Heading>{t(PAGE_TITLES[page.type], lang)}</Heading>
          <p className="bible-desc mt-3">{t(S.chooseDish, lang)}</p>
        </>
      ) : (
        <>
          {/* Phase 1 has no dish photos (photoFileId is always null) — §8's dashed placeholder. */}
          <div className="bible-photo-missing my-2">
            <ImageIcon className="h-6 w-6" aria-hidden="true" />
            <span className="text-sm font-semibold">{item.name}</span>
            <span className="text-xs">{t(S.photoMissing, lang)}</span>
          </div>
          <Heading>{item.name}</Heading>
          {item.description && <p className="bible-desc mt-2">{item.description}</p>}
          <p className="bible-mono tabular mt-3 text-[15px] font-semibold">{formatPrices(item.prices)}</p>
          <div className="mt-2">
            <Tags item={item} lang={lang} />
          </div>
          <p className="bible-mono bible-muted mt-3 text-[11px]">{t(S.taxNote, lang)}</p>
          <p className="bible-mono bible-muted text-[11px]">{item.itemCode}</p>
        </>
      )}
    </PageFrame>
  )
}

function NotesPage({ page }: { page: BookPage }) {
  const { lang } = useReader()
  const { item } = useSectionMenu(page.section!)
  const notes = item?.serviceNotes
  const title = t(PAGE_TITLES.notes, lang)
  if (!item || !notes) {
    return (
      <PageFrame page={page}>
        <ComingSoon title={item ? `${title} — ${item.name}` : title} lang={lang} />
      </PageFrame>
    )
  }
  const rows = [
    [notes.howToExplain, S.notesHowToExplain],
    [notes.pairing, S.notesPairing],
    [notes.upsell, S.notesUpsell],
    [notes.guestQuestions, S.notesGuestQuestions],
  ] as const
  return (
    <PageFrame page={page}>
      <Heading>{item.name}</Heading>
      <p className="bible-desc bible-boxed mt-2 text-[13px]">{t(S.allergen, lang)}</p>
      {rows.map(([body, label]) => (
        <div key={label.en} className="bible-rule py-2">
          <p className="text-sm font-semibold">{t(label, lang)}</p>
          <p className="bible-desc">{body}</p>
        </div>
      ))}
    </PageFrame>
  )
}

function SopPage({ page }: { page: BookPage }) {
  const { lang } = useReader()
  const section = page.section!
  const [sops, setSops] = useState<Sop[] | null>(null)
  const [denied, setDenied] = useState(false)
  // The sops read rule keys on systemSettings/sopAccess, not departmentId, so
  // filtering by department here is safe (root CLAUDE.md, "a list is not a batch of gets").
  useEffect(() => {
    const departments = SECTION_SOP_DEPARTMENTS[section]
    return subscribeToSops(
      (rows) => setSops(rows.filter((s) => departments.includes(s.departmentId))),
      () => setDenied(true),
    )
  }, [section])
  const numbers = (sops ?? []).map((s) => s.sopNumber).filter(Boolean).sort()
  return (
    <PageFrame page={page}>
      <Heading>{t(PAGE_TITLES.sop, lang)}</Heading>
      {numbers.length > 0 && (
        <p className="bible-mono bible-accent mt-1 text-[12px] font-semibold">
          {numbers[0]}
          {numbers.length > 1 ? ` – ${numbers[numbers.length - 1]}` : ''}
        </p>
      )}
      <div className="mt-3">
        {denied ? (
          <p className="bible-desc">{t(S.notAvailable, lang)}</p>
        ) : sops === null ? (
          <div className="bible-skeleton h-24" />
        ) : sops.length === 0 ? (
          <p className="bible-desc">{t(S.noSops, lang)}</p>
        ) : (
          sops.map((sop) =>
            sop.driveUrl ? (
              <a key={sop.id} href={sop.driveUrl} target="_blank" rel="noopener noreferrer" className="bible-row">
                <span className="bible-mono bible-muted w-20 shrink-0 text-[12px]">{sop.sopNumber}</span>
                <span className="flex-1">{sop.topic}</span>
                <ExternalLink className="bible-muted h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <div key={sop.id} className="bible-row">
                <span className="bible-mono bible-muted w-20 shrink-0 text-[12px]">{sop.sopNumber}</span>
                <span className="flex-1">{sop.topic}</span>
                <span className="bible-muted text-[12px] font-normal">{t(S.notAvailable, lang)}</span>
              </div>
            ),
          )
        )}
      </div>
    </PageFrame>
  )
}

/**
 * Recipe and Production Procedure — Phase 3. Until then a permitted reader
 * sees Coming soon and anyone else the Locked page naming the owning team
 * (§15). getBibleRecipe will be the enforcement point, not this check.
 */
function RecipePage({ page }: { page: BookPage }) {
  const { lang, access } = useReader()
  const owner = SECTION_OWNERS[page.section!][0]
  const title = t(PAGE_TITLES[page.type], lang)
  if (!access.recipeOwners.includes(owner)) {
    return (
      <PageFrame page={page}>
        <Heading>{title}</Heading>
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <Lock className="bible-accent h-8 w-8" aria-hidden="true" />
          <p className="bible-desc">{fill(t(S.locked, lang), { team: t(OWNER_TEAMS[owner], lang) })}</p>
        </div>
      </PageFrame>
    )
  }
  return (
    <PageFrame page={page}>
      <ComingSoon title={title} lang={lang} />
    </PageFrame>
  )
}

function BackCoverPage() {
  const { lang, goTo } = useReader()
  return (
    <div className="bible-kraft relative flex h-full flex-col items-center justify-center gap-6 p-10 text-center">
      <div className="bible-kraft-frame" />
      <h2 className="text-4xl font-extrabold tracking-tight" tabIndex={-1} data-page-heading>
        NOURISH.
      </h2>
      <button type="button" className="bible-kraft-btn" onClick={() => goTo('title')}>
        {t(S.openFromStart, lang)}
      </button>
    </div>
  )
}

export function PageView({ page }: { page: BookPage }) {
  const { lang } = useReader()
  switch (page.type) {
    case 'endpaper':
      return <EndpaperPage page={page} />
    case 'title':
      return <TitlePage />
    case 'contents':
      return <ContentsPage page={page} />
    case 'opener':
      return <OpenerPage page={page} />
    case 'toc':
      return <TocPage page={page} />
    case 'grooming':
      return <ContentBlocksPage page={page} kind="grooming" scopes={['frontOfHouse', 'backOfHouse']} />
    case 'sequence':
      return <ContentBlocksPage page={page} kind="sequenceOfService" scopes={[page.section ?? '']} />
    case 'forms':
      return <FormsPage page={page} />
    case 'menu':
      return <MenuPage page={page} />
    case 'category':
      return <CategoryPage page={page} />
    case 'dish':
    case 'picture':
      return <DishPage page={page} />
    case 'notes':
      return <NotesPage page={page} />
    case 'sop':
      return <SopPage page={page} />
    case 'recipe':
    case 'procedure':
      return <RecipePage page={page} />
    case 'back':
      return <BackCoverPage />
    default:
      return (
        <PageFrame page={page}>
          <ComingSoon title={t(CHAPTER_TITLES[page.chapter ?? 'wholefood'], lang)} lang={lang} />
        </PageFrame>
      )
  }
}
