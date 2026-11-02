import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ExternalLink, Lock, Search } from 'lucide-react'
import type { BibleMenuItem, DocumentResource, Sop } from '@/types'
import { subscribeToSops } from '../../sopLibrary/sopService'
import { subscribeToDocumentResources } from '../../resources/documentResourceService'
import { CHAPTERS, SECTION_OWNERS, SECTION_SOP_DEPARTMENTS, formatPrices, type BookPage, type SectionId } from '../bibleBook'
import { useReader, type SectionSelection } from '../readerContext'
import { CategoryBar } from '../menu'
import { chapterLabel, sectionLabel } from '../nav'
import { S, CHAPTER_TITLES, OWNER_TEAMS, PAGE_TITLES, TAG_LABELS, fill, t, type Lang } from '../strings'

// ---- Frame ------------------------------------------------------------------

function Heading({ children, className = 'bible-h1' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={className} tabIndex={-1} data-page-heading>
      {children}
    </h2>
  )
}

/** §5.1 — running head ("F&B SERVICE · A. FLOOR"), heading, scrolling body, dashed footer with NOURISH and the page number. */
function PageFrame({ page, children }: { page: BookPage; children: ReactNode }) {
  const { lang } = useReader()
  const run = [page.chapter ? t(CHAPTER_TITLES[page.chapter], lang) : t(S.book, lang), page.section ? sectionLabel(page.section, lang) : '']
    .filter(Boolean)
    .join(' · ')
  return (
    <div className="bible-frame">
      <p className="bible-run bible-mono" aria-hidden="true">
        {run}
      </p>
      <div className="bible-page-body">{children}</div>
      <div className="bible-page-foot bible-mono" aria-hidden="true">
        <span>NOURISH</span>
        <span className="tabular">{page.number}</span>
      </div>
    </div>
  )
}

/** A dashed row with a label, an optional line under it, and a mono number on the right. */
function Row({ label, sub, right, onClick, indent = false, strong = false }: { label: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void; indent?: boolean; strong?: boolean }) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className={`block ${strong ? 'font-bold' : indent ? 'font-medium' : ''}`}>{label}</span>
        {sub && <span className="bible-muted block text-[12px] font-normal leading-snug">{sub}</span>}
      </span>
      {right !== undefined && <span className="bible-row-num tabular">{right}</span>}
    </>
  )
  const style = indent ? { paddingLeft: 16 } : undefined
  return onClick ? (
    <button type="button" className="bible-row" style={style} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="bible-row" style={style}>
      {body}
    </div>
  )
}

/** A note line under the heading, before the rows. */
function Note({ children }: { children: ReactNode }) {
  return <p className="bible-desc mb-2">{children}</p>
}

function ComingSoon({ title, lang }: { title: string; lang: Lang }) {
  return (
    <>
      <Heading>{title}</Heading>
      <div className="mt-8 flex flex-col items-start gap-2">
        <span className="bible-chip">{t(S.comingSoon, lang)}</span>
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
    <div className="bible-seg is-paper" role="group" aria-label={t(S.foodOrBeverage, lang)}>
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
      <Search className="h-[18px] w-[18px]" aria-hidden="true" />
      {t(S.search, lang)}
    </button>
  )
}

/** Dish tags spelled out as Pandan-outlined chips ("Vegetarian", "Gluten free"). */
function Tags({ item, lang }: { item: BibleMenuItem; lang: Lang }) {
  return (
    <>
      {item.tags.map((tag) => (
        <span key={tag} className="bible-tag">
          {TAG_LABELS[tag] ? t(TAG_LABELS[tag], lang) : tag}
        </span>
      ))}
    </>
  )
}

// ---- Templates (design guide §5.2) ----------------------------------------------

/** Inside of the front board: kraft, dashed frame, edition and publish date. */
function EndpaperPage() {
  const { lang, edition } = useReader()
  const published = edition.publishedAt ? new Date(edition.publishedAt).toLocaleDateString('en-GB', { dateStyle: 'long' }) : ''
  return (
    <div className="bible-kraft is-inside relative h-full">
      <div className="bible-kraft-frame flex flex-col items-center justify-center gap-2.5 px-6 text-center" style={{ left: 20, right: 34, top: 20, bottom: 20 }}>
        <Heading className="bible-kraft-mark">NOURISH</Heading>
        <p className="text-sm font-medium leading-normal">
          {fill(t(S.edition, lang), { n: edition.editionNumber })}
          {published && ` · ${published}`}
        </p>
      </div>
    </div>
  )
}

/** Pandan page with the Welcome Card ticket: notches and perforation on the stub side, rising title words. */
function TitlePage() {
  const { lang, edition } = useReader()
  const words = t(S.book, lang).split(' ')
  return (
    <div className="bible-pandan flex h-full flex-col justify-center pl-10 pr-7">
      <div className="bible-ticket">
        <span className="bible-ticket-perf" aria-hidden="true" />
        <h2 className="mb-4 text-[34px] font-bold leading-[1.2] tracking-[-0.01em]" tabIndex={-1} data-page-heading>
          {words.map((word, i) => (
            <span key={i} className="bible-word mr-[0.26em] inline-block" style={{ ['--i' as string]: i }}>
              {word}
            </span>
          ))}
        </h2>
        <p className="bible-version-chip bible-chip-in mb-[18px]">{fill(t(S.edition, lang), { n: edition.editionNumber })}</p>
        <p className="bible-note-in text-sm leading-normal" style={{ color: 'var(--bible-cream-soft)' }}>
          {t(S.subtitle, lang)}
        </p>
        <div className="bible-ticket-stub bible-note-in">
          <p className="bible-eyebrow mb-0.5">NOURISH</p>
          <p className="bible-mono text-[11px]" style={{ color: 'var(--bible-cream-soft)' }}>
            {t(S.company, lang)}
          </p>
        </div>
      </div>
    </div>
  )
}

function ContentsPage({ page }: { page: BookPage }) {
  const { lang, pages, goTo } = useReader()
  const sub = (key: string, label: string) => {
    const target = pages.find((p) => p.key === key)
    return target && <Row key={key} label={label} right={target.number} indent onClick={() => goTo(key)} />
  }
  return (
    <PageFrame page={page}>
      <Heading>{t(S.contents, lang)}</Heading>
      {CHAPTERS.map((chapter) => {
        const opener = pages.find((p) => p.key === `${chapter.id}.opener`)
        return (
          <div key={chapter.id} className="contents">
            {opener && <Row label={t(CHAPTER_TITLES[chapter.id], lang)} right={opener.number} strong onClick={() => goTo(opener.key)} />}
            {chapter.id === 'general' && (
              <>
                {sub('general.grooming', t(PAGE_TITLES.grooming, lang))}
                {sub('general.forms', t(PAGE_TITLES.forms, lang))}
              </>
            )}
            {chapter.sections.map((section) => {
              const target = pages.find((p) => p.section === section)
              return target && sub(target.key, sectionLabel(section, lang))
            })}
          </div>
        )
      })}
    </PageFrame>
  )
}

/** Pandan chapter opener: eyebrow, amber numeral, title, set low on the page. */
function OpenerPage({ page }: { page: BookPage }) {
  const { lang } = useReader()
  const chapter = CHAPTERS.find((c) => c.id === page.chapter)!
  return (
    <div className="bible-pandan relative h-full">
      <div className="absolute bottom-[54px] left-[30px] right-[34px]">
        <p className="bible-eyebrow uppercase" style={{ fontSize: 12 }}>
          {t(S.chapter, lang)} {chapter.numeral}
        </p>
        <span className="bible-numeral tabular" aria-hidden="true">
          {chapter.numeral}
        </span>
        <Heading className="bible-chapter-title">
          <span className="bible-sr-only">{chapterLabel(chapter.id, lang)}: </span>
          <span aria-hidden="true">{t(CHAPTER_TITLES[chapter.id], lang)}</span>
        </Heading>
      </div>
    </div>
  )
}

function TocPage({ page }: { page: BookPage }) {
  const { lang, pages, goTo } = useReader()
  const chapter = CHAPTERS.find((c) => c.id === page.chapter)!
  return (
    <PageFrame page={page}>
      <Heading>{t(S.inThisChapter, lang)}</Heading>
      {chapter.sections.map((section) => {
        const sectionPages = pages.filter((p) => p.section === section)
        if (sectionPages.length === 0) return null
        return (
          <Row
            key={section}
            label={sectionLabel(section, lang)}
            sub={sectionPages.map((p) => t(PAGE_TITLES[p.type], lang)).join(' · ')}
            right={sectionPages[0].number}
            onClick={() => goTo(sectionPages[0].key)}
          />
        )
      })}
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
            <section key={block.id} className="mb-3">
              <h3 className="bible-accent mb-1 text-base font-bold">{t(block.heading, lang)}</h3>
              {block.blocks.map((b, i) =>
                kind === 'sequenceOfService' ? (
                  <div key={i} className="bible-step">
                    <span className="bible-step-no" aria-hidden="true">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-semibold leading-tight">{t(b.label, lang)}</p>
                      <p className="bible-desc mt-0.5" style={{ fontSize: 12.5 }}>
                        {t(b.body, lang)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <Row key={i} label={t(b.label, lang)} sub={t(b.body, lang)} />
                ),
              )}
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
          <button type="button" className="bible-tag min-h-12 shrink-0 px-3" onClick={() => navigate('/documents/company-forms/new')}>
            {t(S.addForm, lang)}
          </button>
        )}
      </div>
      <Note>{t(S.formsNote, lang)}</Note>
      {forms === null && <div className="bible-skeleton h-24" />}
      {forms?.length === 0 && <p className="bible-desc">{t(S.noForms, lang)}</p>}
      {forms?.map((form) => (
        <div key={form.id} className="bible-row">
          <a href={form.driveUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 min-w-0 flex-1 items-center gap-2">
            <span className="min-w-0 flex-1">
              <span className="block">{form.title}</span>
              {form.category && <span className="bible-muted block text-[12px] font-normal">{form.category}</span>}
            </span>
            <span className="bible-row-num">Drive</span>
            <ExternalLink className="bible-muted h-4 w-4 shrink-0" aria-label={t(S.open, lang)} />
          </a>
          {canPublishForms && (
            <button type="button" className="bible-tag min-h-12 shrink-0 px-3" onClick={() => navigate(`/documents/company-forms/${form.id}/edit`)}>
              {t(S.edit, lang)}
            </button>
          )}
        </div>
      ))}
    </PageFrame>
  )
}

/** Search field and Food/Beverage switch, then the two-column category grid with counts. */
function MenuPage({ page }: { page: BookPage }) {
  const { lang, select, goTo } = useReader()
  const section = page.section!
  const menu = useSectionMenu(section)
  return (
    <PageFrame page={page}>
      <Heading>{t(S.menuFull, lang)}</Heading>
      <div className="mb-2 flex flex-none gap-2">
        <SearchButton />
        <GroupSwitch section={section} groups={menu.groups} group={menu.group} />
      </div>
      <div className="grid flex-none grid-cols-2 content-start gap-1">
        {menu.inGroup.map((category) => (
          <button
            key={category.id}
            type="button"
            className="bible-cat-tile"
            aria-pressed={category.id === menu.category?.id}
            onClick={() => {
              select(section, { categoryId: category.id, itemId: null, group: category.group })
              goTo(`${page.chapter}.${section}.category`)
            }}
          >
            <span>{category.label}</span>
            <span className="bible-mono tabular flex-none text-[11px]" aria-label={fill(t(S.items, lang), { n: menu.counts.get(category.id) ?? 0 })}>
              {menu.counts.get(category.id) ?? 0}
            </span>
          </button>
        ))}
      </div>
      <p className="bible-mono bible-muted mt-2 text-[11px]">{t(S.pricesInThousands, lang)}</p>
    </PageFrame>
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
      <Heading>{category?.label ?? t(PAGE_TITLES.category, lang)}</Heading>
      <div className="mb-1.5 flex flex-none items-center gap-2">
        <SearchButton compact />
        <GroupSwitch section={section} groups={menu.groups} group={menu.group} />
        {category?.servingHours && (
          <span className="bible-mono flex-1 text-right text-[11px] font-semibold" style={{ color: 'var(--bible-ink-soft)' }}>
            {category.servingHours}
          </span>
        )}
      </div>
      <nav aria-label={t(S.categories, lang)}>
        <CategoryBar categories={menu.inGroup} activeId={category?.id ?? null} onChoose={(c) => select(section, { categoryId: c.id, itemId: null })} />
      </nav>
      <ul className="flex-none">
        {menu.categoryItems.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="bible-dish-row"
              onClick={() => {
                select(section, { itemId: item.id, categoryId: item.categoryId })
                goTo(dishKey)
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-bold leading-tight">{item.name}</span>
                {item.description && <span className="bible-dish-desc">{item.description}</span>}
              </span>
              {item.tags.length > 0 && <span className="bible-mono bible-accent flex-none text-[11px] font-semibold">{item.tags.join(' ')}</span>}
              <span className="bible-price tabular flex-none text-[12.5px]">{formatPrices(item.prices)}</span>
            </button>
          </li>
        ))}
      </ul>
      {category?.note && (
        <p className="bible-desc mt-2" style={{ fontSize: 12.5 }}>
          {category.note}
        </p>
      )}
    </PageFrame>
  )
}

/** Dish (Floor/Cashier) and Picture (Kitchen/Bar/Bakery) — the same slot (§5.4). */
function DishPage({ page }: { page: BookPage }) {
  const { lang, goTo, categoriesById } = useReader()
  const section = page.section!
  const { item } = useSectionMenu(section)
  const category = item ? categoriesById.get(item.categoryId) : null
  if (!item) {
    return (
      <PageFrame page={page}>
        <Heading>{t(PAGE_TITLES[page.type], lang)}</Heading>
        <p className="bible-desc">{t(S.chooseDish, lang)}</p>
      </PageFrame>
    )
  }
  return (
    <PageFrame page={page}>
      <Heading>{item.name}</Heading>
      {category && (
        <button
          type="button"
          className="-mt-2 mb-0.5 flex min-h-12 flex-none items-center gap-1 self-start pr-2 text-[13.5px] font-semibold"
          style={{ color: 'var(--bible-pandan)' }}
          aria-label={fill(t(S.backTo, lang), { name: category.label })}
          onClick={() => goTo(`${page.chapter}.${section}.category`)}
        >
          <ChevronLeft className="h-[18px] w-[18px]" aria-hidden="true" />
          {category.label}
        </button>
      )}
      {/* Phase 1 has no dish photos (photoFileId is always null) — §8's dashed placeholder. */}
      <div className="bible-photo-missing flex-1">
        <span>{item.name}</span>
        <span className="text-[11px]">{t(S.photoMissing, lang)}</span>
      </div>
      {item.description && <p className="bible-desc mt-2.5 flex-none" style={{ color: 'var(--bible-ink)' }}>{item.description}</p>}
      <div className="mt-2 flex flex-none flex-wrap items-center gap-1.5">
        <span className="bible-price tabular text-sm">{formatPrices(item.prices)}</span>
        <Tags item={item} lang={lang} />
      </div>
      <p className="bible-muted mt-1.5 flex-none text-[11.5px]">
        {t(S.taxNote, lang)} <span className="bible-mono">{item.itemCode}</span>
      </p>
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
      <Heading>{title}</Heading>
      <p className="bible-desc bible-boxed mb-2" style={{ fontSize: 13 }}>
        <span className="font-semibold" style={{ color: 'var(--bible-ink)' }}>
          {item.name}.
        </span>{' '}
        {t(S.allergen, lang)}
      </p>
      {rows.map(([body, label]) => (
        <Row key={label.en} label={t(label, lang)} sub={body} />
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
  // Heading is the code range ("KIT SOP 01 – KIT SOP 100") once the register has rows.
  const range = numbers.length > 0 ? `${numbers[0]}${numbers.length > 1 ? ` – ${numbers[numbers.length - 1]}` : ''}` : t(PAGE_TITLES.sop, lang)
  return (
    <PageFrame page={page}>
      <Heading>{range}</Heading>
      <Note>{t(S.sopNote, lang)}</Note>
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
              <span className="min-w-0 flex-1">{sop.topic}</span>
              <span className="bible-row-num tabular">{sop.sopNumber}</span>
              <ExternalLink className="bible-muted h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          ) : (
            <Row key={sop.id} label={sop.topic} sub={t(S.notAvailable, lang)} right={sop.sopNumber} />
          ),
        )
      )}
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

/** Back cover: one kraft button that reopens at the title page (§9). */
function BackCoverPage() {
  const { lang, goTo } = useReader()
  return (
    <button type="button" className="bible-kraft relative h-full w-full" onClick={() => goTo('title')} aria-label={t(S.openFromStart, lang)} data-page-heading>
      <span className="bible-spine is-right" aria-hidden="true" />
      <span className="bible-kraft-frame" style={{ left: 16, right: 40, top: 16, bottom: 16 }} aria-hidden="true" />
      <span className="absolute bottom-[38px] left-4 right-10 block text-center">
        <span className="bible-kraft-mark">NOURISH</span>
        <span className="mt-1 block text-[13px] font-semibold">{t(S.openFromStart, lang)}</span>
      </span>
    </button>
  )
}

export function PageView({ page }: { page: BookPage }) {
  const { lang } = useReader()
  switch (page.type) {
    case 'endpaper':
      return <EndpaperPage />
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
