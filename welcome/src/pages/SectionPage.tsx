import { useEffect, useRef, useState } from 'react'
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
import { COMPANY_PROFILE, CORE_VALUES, GROOMING, type CoreValueItem, type StaticBlock } from '../content/static'
import { STRINGS, t, type Lang } from '../strings'
import type { GuideContent, MenuContent, OrgChartContent, WelcomeContent } from '../api'

/**
 * welcome-portal.md §7.4 — the seven content sections, three static in the
 * bundle and four served from `welcomeContent`.
 *
 * Every section renders the same way whether its source is a constant or a
 * Firestore document: the hire cannot tell, and should not be able to.
 */

export type SectionKey = 'profile' | 'values' | 'grooming' | 'menu' | 'orgChart' | 'attendance' | 'dosDonts'

export function SectionPage({
  section,
  content,
  lang,
  onBack,
}: {
  section: SectionKey
  content: WelcomeContent | null
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
      {section === 'grooming' ? <Blocks blocks={GROOMING} lang={lang} /> : null}
      {section === 'menu' ? <Menu content={content?.sections.menu ?? null} lang={lang} /> : null}
      {section === 'orgChart' ? <OrgChart content={content?.sections.orgChart ?? null} lang={lang} /> : null}
      {section === 'attendance' ? <Guide content={content?.sections.attendanceGuide ?? null} lang={lang} /> : null}
      {section === 'dosDonts' ? <Guide content={content?.sections.dosAndDonts ?? null} lang={lang} /> : null}
    </div>
  )
}

const TITLES = {
  profile: STRINGS.secProfile,
  values: STRINGS.secValues,
  grooming: STRINGS.secGrooming,
  menu: STRINGS.secMenu,
  orgChart: STRINGS.secOrgChart,
  attendance: STRINGS.secAttendance,
  dosDonts: STRINGS.secDosDonts,
} as const

function Blocks({ blocks, lang }: { blocks: StaticBlock[]; lang: Lang }) {
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, index) => (
        <Card key={index} index={index}>
          <h2 className="mb-2 font-semibold">{t(block.heading, lang)}</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--w-cream-soft)]">
            {t(block.body, lang)}
          </p>
        </Card>
      ))}
    </div>
  )
}

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

/** The HR-editable guides share the static blocks' shape, so they render the same. */
function Guide({ content, lang }: { content: GuideContent | null; lang: Lang }) {
  if (!content || content.blocks.length === 0) return <Notice>{t(STRINGS.sectionEmpty, lang)}</Notice>
  return <Blocks blocks={content.blocks} lang={lang} />
}

function Menu({ content, lang }: { content: MenuContent | null; lang: Lang }) {
  if (!content || content.categories.length === 0) return <Notice>{t(STRINGS.sectionEmpty, lang)}</Notice>

  return (
    <div className="flex flex-col gap-3">
      {content.categories.map((category, index) => (
        <Card key={index} index={index}>
          <h2 className="mb-3 font-semibold">{t(category.title, lang)}</h2>
          <ul className="flex flex-col divide-y divide-white/10">
            {category.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex items-baseline justify-between gap-3 py-2.5">
                <span className="text-sm">
                  {item.name}
                  {item.tags ? (
                    <span className="w-mono ml-2 text-[11px] uppercase text-[var(--w-amber)]">{item.tags}</span>
                  ) : null}
                </span>
                <span className="w-mono flex-none text-sm text-[var(--w-cream-soft)]">{item.price}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {/* §7.4 — both notices MUST render. They are a legal and a safety
          statement, not decoration, so they are in the app rather than left to
          whoever fills in the menu content. */}
      <Notice>{t(STRINGS.menuLegend, lang)}</Notice>
      <Notice>{t(STRINGS.menuTaxNote, lang)}</Notice>
      <Notice tone="error">{t(STRINGS.menuAllergenNote, lang)}</Notice>
    </div>
  )
}

/**
 * §7.4 — "Image with pinch-zoom (the chart is too wide for a phone
 * otherwise)." A scrollable container with `touch-action: pinch-zoom` is what
 * gives that natively; a zoom library would be larger than this whole app.
 */
function OrgChart({ content, lang }: { content: OrgChartContent | null; lang: Lang }) {
  const [failed, setFailed] = useState(false)

  if (!content?.imageUrl || failed) return <Notice>{t(STRINGS.sectionEmpty, lang)}</Notice>

  return (
    <Card index={0}>
      <p className="mb-3 text-sm text-[var(--w-cream-soft)]">{t(content.caption, lang)}</p>
      <div className="overflow-auto rounded-xl bg-white/5" style={{ touchAction: 'pinch-zoom' }}>
        <img
          src={content.imageUrl}
          alt={t(STRINGS.secOrgChart, lang)}
          className="min-w-[640px] max-w-none"
          onError={() => setFailed(true)}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--w-cream-faint)]">{t(STRINGS.orgChartZoom, lang)}</p>
    </Card>
  )
}
