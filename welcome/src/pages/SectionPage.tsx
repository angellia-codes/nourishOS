import { useEffect, useRef } from 'react'
import {
  BadgeIcon,
  BagIcon,
  BulbIcon,
  Button,
  Card,
  EyeIcon,
  HandshakeIcon,
  HeartIcon,
  ImagePlaceholder,
  InstagramIcon,
  LeafIcon,
  MailIcon,
  MedalIcon,
  Notice,
  PhoneIcon,
  PinIcon,
  ShieldIcon,
  SparkleIcon,
  StoreIcon,
  TargetIcon,
} from '../ui'
import { COMPANY_PROFILE, CORE_VALUES, type CoreValueItem } from '../content/static'
import { STRINGS, t, type Lang } from '../strings'
import { GroomingSection } from './GroomingSection'
import { HolidaySection } from './HolidaySection'

/**
 * welcome-portal.md §7.4 — the content sections, all bundled with the app:
 * Company Profile, Core Values, Grooming Standard, Public Holiday 2026
 * (2026-09-26, `content/holidays.ts`), the Menu scans (2026-09-28) and the
 * Organization Chart (2026-11-09, v1.8 — the same `org-chart.png` Nourish's
 * Bible shows). The Attendance Guide was removed in v1.8, and with it the last
 * HR-editable `welcomeContent` section, so nothing here reads Firestore.
 */

export type SectionKey = 'profile' | 'values' | 'grooming' | 'menu' | 'orgChart' | 'holidays'

export function SectionPage({
  section,
  lang,
  onBack,
}: {
  section: SectionKey
  lang: Lang
  onBack: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [section])

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pb-8 pt-4">
      <Button variant="ghost" className="self-start" onClick={onBack}>
        ← {t(STRINGS.navHome, lang)}
      </Button>

      <h1 ref={headingRef} tabIndex={-1} className="px-1 text-xl font-bold outline-none">
        {t(TITLES[section], lang)}
      </h1>

      {section === 'profile' ? <CompanyProfile lang={lang} /> : null}
      {section === 'values' ? <CoreValues lang={lang} /> : null}
      {section === 'grooming' ? <GroomingSection lang={lang} /> : null}
      {section === 'menu' ? <Menu lang={lang} /> : null}
      {section === 'orgChart' ? <OrgChart lang={lang} /> : null}
      {section === 'holidays' ? <HolidaySection lang={lang} /> : null}
    </div>
  )
}

const TITLES = {
  profile: STRINGS.secProfile,
  values: STRINGS.secValues,
  grooming: STRINGS.secGrooming,
  menu: STRINGS.secMenu,
  orgChart: STRINGS.secOrgChart,
  holidays: STRINGS.secPublicHoliday,
} as const

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 font-semibold">
      <span className="flex-none text-[var(--w-amber)]">{icon}</span>
      {children}
    </h2>
  )
}

/**
 * The real Nourish Bali profile (§7.4), replacing the generic heading/body
 * list every other static section uses — brands and locations each need
 * their own layout (a photo slot, a map link), not just a paragraph.
 */
function CompanyProfile({ lang }: { lang: Lang }) {
  const c = COMPANY_PROFILE
  return (
    <div className="flex flex-col gap-3">
      <Card index={0}>
        <ImagePlaceholder imageUrl={c.heroImageUrl} alt="Nourish Bali" caption={t(STRINGS.photoComingSoon, lang)} />
        <p className="mt-4 text-center text-base font-semibold italic text-[var(--w-amber)]">{t(c.slogan, lang)}</p>
      </Card>

      <Card index={1}>
        <SectionHeading icon={LeafIcon}>{t(c.aboutUsHeading, lang)}</SectionHeading>
        <p className="text-sm leading-relaxed text-[var(--w-cream-soft)]">{t(c.aboutUs, lang)}</p>
      </Card>

      <Card index={2}>
        <SectionHeading icon={EyeIcon}>{t(c.visionHeading, lang)}</SectionHeading>
        <p className="text-sm leading-relaxed text-[var(--w-cream-soft)]">{t(c.vision, lang)}</p>
      </Card>

      <Card index={3}>
        <SectionHeading icon={TargetIcon}>{t(c.missionHeading, lang)}</SectionHeading>
        <p className="text-sm leading-relaxed text-[var(--w-cream-soft)]">{t(c.mission, lang)}</p>
      </Card>

      <Card index={4}>
        <SectionHeading icon={StoreIcon}>{t(c.brandsHeading, lang)}</SectionHeading>
        <div className="flex flex-col gap-4">
          {c.brands.map((brand) => (
            <div key={brand.name} className="flex flex-col gap-2">
              <ImagePlaceholder
                imageUrl={brand.imageUrl}
                alt={brand.name}
                caption={t(STRINGS.photoComingSoon, lang)}
              />
              <p className="font-semibold text-[var(--w-cream)]">{brand.name}</p>
              <p className="text-sm leading-relaxed text-[var(--w-cream-soft)]">{t(brand.body, lang)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card index={5}>
        <SectionHeading icon={BagIcon}>{t(c.servicesHeading, lang)}</SectionHeading>
        <div className="flex flex-col divide-y divide-white/10">
          {c.services.map((service, index) => (
            <div key={index} className={index === 0 ? 'pb-4' : 'pt-4'}>
              <p className="font-semibold text-[var(--w-cream)]">{t(service.name, lang)}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--w-cream-soft)]">{t(service.body, lang)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card index={6}>
        <SectionHeading icon={PinIcon}>{t(c.locationsHeading, lang)}</SectionHeading>
        <p className="mb-3 text-sm leading-relaxed text-[var(--w-cream-soft)]">{t(c.locationsIntro, lang)}</p>
        <ul className="flex flex-col divide-y divide-white/10">
          {c.locations.map((location) => (
            <li key={location.name} className="py-2.5">
              <a
                href={location.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-focusable flex items-center justify-between gap-2 rounded text-sm"
              >
                <span className="font-medium text-[var(--w-cream)]">{location.name}</span>
                <span className="text-xs font-semibold text-[var(--w-amber)] underline underline-offset-2">
                  {t(STRINGS.openInMaps, lang)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card index={7}>
        <SectionHeading icon={PhoneIcon}>{t(c.contactHeading, lang)}</SectionHeading>
        <ul className="flex flex-col gap-3 text-sm">
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 flex-none text-[var(--w-cream-faint)]">{PhoneIcon}</span>
            <a href={`tel:${c.contact.phone.replace(/[\s-]/g, '')}`} className="w-focusable rounded text-[var(--w-cream)]">
              {c.contact.phone}
              <span className="block text-xs text-[var(--w-cream-soft)]">{c.contact.phoneContactName}</span>
            </a>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 flex-none text-[var(--w-cream-faint)]">{MailIcon}</span>
            <a href={`mailto:${c.contact.email}`} className="w-focusable rounded text-[var(--w-cream)]">
              {c.contact.email}
            </a>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 flex-none text-[var(--w-cream-faint)]">{PinIcon}</span>
            <span className="text-[var(--w-cream-soft)]">{c.contact.address}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 flex-none text-[var(--w-cream-faint)]">{InstagramIcon}</span>
            <a
              href={`https://www.instagram.com/${c.contact.instagramHandle.replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-focusable rounded text-[var(--w-cream)]"
            >
              {c.contact.instagramHandle}
            </a>
          </li>
        </ul>
      </Card>
    </div>
  )
}

const CORE_VALUE_ICONS: Record<CoreValueItem['icon'], React.ReactNode> = {
  shield: ShieldIcon,
  heart: HeartIcon,
  sparkle: SparkleIcon,
  badge: BadgeIcon,
  bulb: BulbIcon,
  handshake: HandshakeIcon,
  medal: MedalIcon,
}

/** The INSPIRE values (§7.4), replacing the generic heading/body list — the hero word and each letter's icon need their own layout. */
function CoreValues({ lang }: { lang: Lang }) {
  const c = CORE_VALUES
  return (
    <div className="flex flex-col gap-3">
      <Card index={0}>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--w-cream-faint)]">
          {t(c.kicker, lang)}
        </p>
        <p className="mt-1 text-[clamp(32px,10vw,44px)] font-bold leading-none tracking-tight text-[var(--w-amber)]">
          {c.hero}
        </p>
        <p className="mt-3 text-base font-semibold text-[var(--w-cream)]">{t(c.slogan, lang)}</p>
        <p className="mt-1 text-sm text-[var(--w-cream-soft)]">{t(c.sloganNote, lang)}</p>
      </Card>

      {c.values.map((value, index) => (
        <Card key={index} index={index + 1}>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/5 text-[var(--w-amber)]">
              {CORE_VALUE_ICONS[value.icon]}
            </span>
            <div>
              <h2 className="font-semibold">
                {value.letter} — {t(value.word, lang)}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--w-cream-soft)]">{t(value.body, lang)}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

/** Full-page menu scans bundled in `welcome/public/`; tap opens full size for zooming. */
const MENU_IMAGES = [1, 2, 3, 4, 5].map((n) => `/menu-${n}.png`)

function Menu({ lang }: { lang: Lang }) {
  return (
    <div className="flex flex-col gap-3">
      {MENU_IMAGES.map((src, index) => (
        <Card key={src} index={index}>
          <a href={src} target="_blank" rel="noreferrer">
            <img
              src={src}
              alt={`${t(STRINGS.secMenu, lang)} ${index + 1}`}
              className="w-full rounded-xl bg-white"
              loading="lazy"
            />
          </a>
        </Card>
      ))}

      {/* §7.4 — the tax notice is a legal statement, so it stays in the app
          rather than being left to whatever each scan happens to print. The
          allergen notice was removed on request 2026-09-28; the scans print it. */}
      <Notice>{t(STRINGS.menuLegend, lang)}</Notice>
      <Notice>{t(STRINGS.menuTaxNote, lang)}</Notice>
    </div>
  )
}

/**
 * §7.4 — "Image with pinch-zoom (the chart is too wide for a phone
 * otherwise)." Rendered exactly as Nourish's Bible does it
 * (src/features/documents/bible/book/generalPages.tsx, `OrgChartPage`): the
 * bundled `public/org-chart.png` on white, 1400px wide inside a scroll box,
 * opened on its centre, with a link to the full-size file. A scrollable
 * container with `touch-action: pinch-zoom` gives the zoom natively; a zoom
 * library would be larger than this whole app.
 */
const ORG_CHART_SRC = '/org-chart.png'

function OrgChart({ lang }: { lang: Lang }) {
  return (
    <Card index={0}>
      <p className="mb-3 text-sm leading-relaxed text-[var(--w-cream-soft)]">{t(STRINGS.orgChartCaption, lang)}</p>
      <div className="overflow-auto rounded-xl bg-white" style={{ touchAction: 'pinch-zoom' }}>
        <img
          src={ORG_CHART_SRC}
          alt={t(STRINGS.secOrgChart, lang)}
          className="w-[1400px] max-w-none"
          // The chart's top is centred, so open on the middle rather than its empty left edge.
          onLoad={(event) => {
            const box = event.currentTarget.parentElement
            if (box) box.scrollLeft = (box.scrollWidth - box.clientWidth) / 2
          }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--w-cream-faint)]">{t(STRINGS.orgChartZoom, lang)}</p>
        <a
          href={ORG_CHART_SRC}
          target="_blank"
          rel="noopener noreferrer"
          className="w-focusable inline-flex min-h-[48px] items-center rounded text-sm font-semibold text-[var(--w-amber)] underline underline-offset-2"
        >
          {t(STRINGS.orgChartOpen, lang)}
        </a>
      </div>
    </Card>
  )
}
