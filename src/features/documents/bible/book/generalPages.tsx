import { useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
// The Welcome portal owns this content (welcome/src/content/*, React-free data);
// the Bible reads the same files so the two never drift. Direction is src → welcome
// only — welcome/ still imports nothing from src/.
import { COMPANY_PROFILE, CORE_VALUES } from '../../../../../welcome/src/content/static'
import { GROOMING_CONTENT, type GroomingLeaf, type GroomingPosition } from '../../../../../welcome/src/content/grooming'
import { PUBLIC_HOLIDAYS } from '../../../../../welcome/src/content/holidays'
import { OPTIONS, STRINGS as W } from '../../../../../welcome/src/strings'
import type { BookPage } from '../bibleBook'
import { useReader } from '../readerContext'
import { PAGE_TITLES, S, t, type Lang, type Pair } from '../strings'
import { Heading, PageFrame, Row } from './pages'

// Photos live in welcome/public/. Globbing them bundles hashed copies into this
// app without duplicating the files in git; content URLs are '/name.png'.
const ASSETS = import.meta.glob(['/welcome/public/grooming-*.png', '/welcome/public/brand-*.png', '/welcome/public/hero-nourish.png', '/welcome/public/org-chart.png'], {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function Photo({ url, alt, lang }: { url?: string; alt: string; lang: Lang }) {
  const src = url ? ASSETS[`/welcome/public${url}`] : undefined
  if (!src) {
    return (
      <div className="bible-photo-missing">
        <span>{alt}</span>
        <span className="text-[11px]">{t(S.photoMissing, lang)}</span>
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" className="w-full flex-none rounded-xl" />
}

function Sub({ children }: { children: React.ReactNode }) {
  return <h3 className="bible-accent mb-1 mt-3 text-base font-bold">{children}</h3>
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="bible-desc" style={{ color: 'var(--bible-ink)' }}>{children}</p>
}

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="-mt-2 mb-0.5 flex min-h-12 flex-none items-center gap-1 self-start pr-2 text-[13.5px] font-semibold"
      style={{ color: 'var(--bible-pandan)' }}
      onClick={onClick}
    >
      <ChevronLeft className="h-[18px] w-[18px]" aria-hidden="true" />
      {label}
    </button>
  )
}

function ExternalRow({ href, label, sub }: { href: string; label: string; sub?: string }) {
  const external = href.startsWith('http')
  return (
    <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className="bible-row">
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        {sub && <span className="bible-muted block text-[12px] font-normal leading-snug">{sub}</span>}
      </span>
      {external && <ExternalLink className="bible-muted h-4 w-4 shrink-0" aria-hidden="true" />}
    </a>
  )
}

// ---- Company Profile -------------------------------------------------------------

export function ProfilePage({ page }: { page: BookPage }) {
  const { lang } = useReader()
  const c = COMPANY_PROFILE
  return (
    <PageFrame page={page}>
      <Heading>{t(PAGE_TITLES.profile, lang)}</Heading>
      <Photo url={c.heroImageUrl} alt="Nourish Bali" lang={lang} />
      <p className="bible-accent mt-2 text-center text-[15px] font-semibold italic">{t(c.slogan, lang)}</p>

      <Sub>{t(c.aboutUsHeading, lang)}</Sub>
      <Body>{t(c.aboutUs, lang)}</Body>
      <Sub>{t(c.visionHeading, lang)}</Sub>
      <Body>{t(c.vision, lang)}</Body>
      <Sub>{t(c.missionHeading, lang)}</Sub>
      <Body>{t(c.mission, lang)}</Body>

      <Sub>{t(c.brandsHeading, lang)}</Sub>
      {c.brands.map((brand) => (
        <div key={brand.name} className="mb-3 flex flex-none flex-col gap-1.5">
          <Photo url={brand.imageUrl} alt={brand.name} lang={lang} />
          <p className="font-bold">{brand.name}</p>
          <Body>{t(brand.body, lang)}</Body>
        </div>
      ))}

      <Sub>{t(c.servicesHeading, lang)}</Sub>
      {c.services.map((service, i) => (
        <Row key={i} label={t(service.name, lang)} sub={t(service.body, lang)} />
      ))}

      <Sub>{t(c.locationsHeading, lang)}</Sub>
      <Body>{t(c.locationsIntro, lang)}</Body>
      {c.locations.map((location) => (
        <ExternalRow key={location.name} href={location.mapUrl} label={location.name} sub={t(W.openInMaps, lang)} />
      ))}

      <Sub>{t(c.contactHeading, lang)}</Sub>
      <ExternalRow href={`tel:${c.contact.phone.replace(/[\s-]/g, '')}`} label={c.contact.phone} sub={c.contact.phoneContactName} />
      <ExternalRow href={`mailto:${c.contact.email}`} label={c.contact.email} />
      <Row label={c.contact.address} />
      <ExternalRow href={`https://www.instagram.com/${c.contact.instagramHandle.replace(/^@/, '')}`} label={c.contact.instagramHandle} />
    </PageFrame>
  )
}

// ---- Core Values -----------------------------------------------------------------

/** INSPIRE — each letter in the numbered-step badge Sequence of Service uses. */
export function CoreValuesPage({ page }: { page: BookPage }) {
  const { lang } = useReader()
  const c = CORE_VALUES
  return (
    <PageFrame page={page}>
      <Heading>{t(PAGE_TITLES.values, lang)}</Heading>
      <p className="bible-accent flex-none text-[40px] font-extrabold leading-none tracking-tight">{c.hero}</p>
      <p className="mt-2 flex-none text-[15px] font-semibold">{t(c.slogan, lang)}</p>
      <p className="bible-desc mb-2">{t(c.sloganNote, lang)}</p>
      {c.values.map((value, i) => (
        <div key={i} className="bible-step">
          <span className="bible-step-no" aria-hidden="true">
            {value.letter}
          </span>
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold leading-tight">{t(value.word, lang)}</p>
            <p className="bible-desc mt-0.5" style={{ fontSize: 12.5 }}>
              {t(value.body, lang)}
            </p>
          </div>
        </div>
      ))}
    </PageFrame>
  )
}

// ---- Organization Chart ------------------------------------------------------------

/**
 * The bundled chart the Welcome portal's seed points at (welcome/public/org-chart.png).
 * The chart is far wider than a page, so it scrolls (pinch-zoom on touch) and opens full size.
 */
export function OrgChartPage({ page }: { page: BookPage }) {
  const { lang } = useReader()
  const src = ASSETS['/welcome/public/org-chart.png']
  return (
    <PageFrame page={page}>
      <Heading>{t(PAGE_TITLES.orgChart, lang)}</Heading>
      <Body>{t(S.orgChartCaption, lang)}</Body>
      <div className="mt-2 flex-none overflow-auto rounded-xl bg-white" style={{ touchAction: 'pinch-zoom', maxHeight: '60%' }}>
        <img
          src={src}
          alt={t(PAGE_TITLES.orgChart, lang)}
          className="w-[1400px] max-w-none"
          // The chart's top is centred, so open on the middle rather than its empty left edge.
          onLoad={(e) => {
            const box = e.currentTarget.parentElement!
            box.scrollLeft = (box.scrollWidth - box.clientWidth) / 2
          }}
        />
      </div>
      <a href={src} target="_blank" rel="noopener noreferrer" className="bible-row">
        <span className="min-w-0 flex-1">{t(S.orgChartOpen, lang)}</span>
        <ExternalLink className="bible-muted h-4 w-4 shrink-0" aria-hidden="true" />
      </a>
    </PageFrame>
  )
}

// ---- Grooming Standard -----------------------------------------------------------

type GroomingView = { kind: 'home' } | { kind: 'category'; id: string } | { kind: 'positions' } | { kind: 'position'; id: string; gender: 'male' | 'female' }

function Notes({ notes, lang }: { notes: Pair[]; lang: Lang }) {
  return (
    <ul className="flex flex-none flex-col gap-1 pl-4" style={{ listStyle: 'disc' }}>
      {notes.map((note, i) => (
        <li key={i} className="bible-desc" style={{ color: 'var(--bible-ink)' }}>
          {t(note, lang)}
        </li>
      ))}
    </ul>
  )
}

function Leaf({ leaf, alt, lang }: { leaf: GroomingLeaf; alt: string; lang: Lang }) {
  return (
    <div className="mb-3 flex flex-none flex-col gap-2">
      {leaf.hasImage && <Photo url={leaf.imageUrl} alt={alt} lang={lang} />}
      <Notes notes={leaf.notes} lang={lang} />
    </div>
  )
}

/** Same drill-down as the Welcome portal's GroomingSection, held in page state rather than extra book pages. */
export function GroomingPage({ page }: { page: BookPage }) {
  const { lang } = useReader()
  const [view, setView] = useState<GroomingView>({ kind: 'home' })
  const c = GROOMING_CONTENT
  const title = t(PAGE_TITLES.grooming, lang)
  const home = () => setView({ kind: 'home' })

  if (view.kind === 'category') {
    const category = c.categories.find((x) => x.id === view.id)!
    return (
      <PageFrame page={page}>
        <Heading>{t(category.heading, lang)}</Heading>
        <BackLink label={title} onClick={home} />
        {category.subcategories.map((sub) => (
          <section key={sub.id} className="flex-none">
            <Sub>{t(sub.heading, lang)}</Sub>
            {sub.leaves.map((leaf, i) => (
              <div key={i}>
                {leaf.name && <p className="mb-1 font-semibold">{t(leaf.name, lang)}</p>}
                <Leaf leaf={leaf} alt={t(leaf.name ?? sub.heading, lang)} lang={lang} />
              </div>
            ))}
          </section>
        ))}
      </PageFrame>
    )
  }

  if (view.kind === 'positions') {
    return (
      <PageFrame page={page}>
        <Heading>{t(c.positionsHeading, lang)}</Heading>
        <BackLink label={title} onClick={home} />
        {c.positions.map((position) => (
          <Row
            key={position.id}
            label={t(position.name, lang)}
            onClick={() => setView({ kind: 'position', id: position.id, gender: position.male ? 'male' : 'female' })}
          />
        ))}
      </PageFrame>
    )
  }

  if (view.kind === 'position') {
    const position: GroomingPosition = c.positions.find((x) => x.id === view.id)!
    const variant = (view.gender === 'male' ? position.male : position.female) ?? position.male ?? position.female
    return (
      <PageFrame page={page}>
        <Heading>{t(position.name, lang)}</Heading>
        <BackLink label={t(c.positionsHeading, lang)} onClick={() => setView({ kind: 'positions' })} />
        {position.male && position.female && (
          <div className="bible-seg is-paper mb-2 self-start" role="group" aria-label={t(W.gender, lang)}>
            {OPTIONS.gender.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={view.gender === option.value}
                onClick={() => setView({ ...view, gender: option.value as 'male' | 'female' })}
              >
                {t(option.label, lang)}
              </button>
            ))}
          </div>
        )}
        {variant && <Leaf leaf={variant} alt={t(position.name, lang)} lang={lang} />}
      </PageFrame>
    )
  }

  return (
    <PageFrame page={page}>
      <Heading>{title}</Heading>
      <p className="bible-accent mb-2 text-[15px] font-semibold italic">{t(c.slogan, lang)}</p>
      <Sub>{t(c.definitionHeading, lang)}</Sub>
      <Body>{t(c.definition, lang)}</Body>
      <div className="mt-3 flex-none">
        {c.categories.map((category) => (
          <Row key={category.id} label={t(category.heading, lang)} strong onClick={() => setView({ kind: 'category', id: category.id })} />
        ))}
        <Row label={t(c.positionsHeading, lang)} strong onClick={() => setView({ kind: 'positions' })} />
      </div>
    </PageFrame>
  )
}

// ---- Public Holiday calendar -----------------------------------------------------

const YEAR = PUBLIC_HOLIDAYS.year
const parseISO = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Month grid with a Hindu / Non-Hindu toggle — port of the Welcome portal's HolidaySection (native Date, Sunday start, 6×7). */
export function HolidaysPage({ page }: { page: BookPage }) {
  const { lang } = useReader()
  const today = new Date()
  const [list, setList] = useState<'hindu' | 'nonHindu'>('hindu')
  const [month, setMonth] = useState(today.getFullYear() === YEAR ? today.getMonth() : 0)

  const holidays = PUBLIC_HOLIDAYS[list]
  const byDate = new Map(holidays.map((h) => [h.date, h.name]))
  const monthHolidays = holidays.filter((h) => parseISO(h.date).getMonth() === month).sort((a, b) => a.date.localeCompare(b.date))

  const start = new Date(YEAR, month, 1)
  const gridStart = new Date(YEAR, month, 1 - start.getDay())
  const days = Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))

  const locale = lang === 'id' ? 'id-ID' : 'en-GB'
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(start)
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
  const dayLabel = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' })
  const todayKey = dateKey(today)

  return (
    <PageFrame page={page}>
      <Heading>{t(PAGE_TITLES.holidays, lang)}</Heading>
      <div className="bible-seg is-paper mb-2 self-start" role="group" aria-label={t(PAGE_TITLES.holidays, lang)}>
        {(['hindu', 'nonHindu'] as const).map((key) => (
          <button key={key} type="button" aria-pressed={list === key} onClick={() => setList(key)}>
            {t(key === 'hindu' ? W.holidayHindu : W.holidayNonHindu, lang)}
          </button>
        ))}
      </div>

      <div className="flex flex-none items-center justify-between">
        <button type="button" className="bible-icon-btn is-paper" aria-label={t(S.prevMonth, lang)} disabled={month === 0} onClick={() => setMonth((m) => m - 1)}>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="font-bold">{monthLabel}</p>
        <button type="button" className="bible-icon-btn is-paper" aria-label={t(S.nextMonth, lang)} disabled={month === 11} onClick={() => setMonth((m) => m + 1)}>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="grid flex-none grid-cols-7 gap-y-0.5 text-center">
        {days.slice(0, 7).map((d, i) => (
          <span key={i} className="bible-mono bible-muted text-[11px] uppercase" aria-hidden="true">
            {weekday.format(d)}
          </span>
        ))}
        {days.map((d) => {
          const key = dateKey(d)
          const name = byDate.get(key)
          const inMonth = d.getMonth() === month
          return (
            <div
              key={key}
              aria-label={name ? `${d.getDate()} — ${name}` : undefined}
              className={`tabular flex flex-col items-center gap-0.5 rounded-lg py-1 text-[13px] ${inMonth ? '' : 'opacity-30'} ${name ? 'font-bold' : ''}`}
              style={key === todayKey ? { boxShadow: 'inset 0 0 0 1.5px var(--bible-pandan)' } : undefined}
            >
              <span className={name ? 'bible-accent' : ''}>{d.getDate()}</span>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: name ? 'var(--bible-pandan)' : 'transparent' }} />
            </div>
          )
        })}
      </div>

      <Sub>{t(W.holidayThisMonth, lang)}</Sub>
      {monthHolidays.length === 0 ? (
        <p className="bible-desc">{t(W.holidayNoneThisMonth, lang)}</p>
      ) : (
        monthHolidays.map((h) => <Row key={h.date} label={h.name} right={dayLabel.format(parseISO(h.date))} />)
      )}
    </PageFrame>
  )
}
