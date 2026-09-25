import { useEffect, useRef, useState } from 'react'
import { Button, Card, Notice } from '../ui'
import { COMPANY_PROFILE, CORE_VALUES, GROOMING, type StaticBlock } from '../content/static'
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

      {section === 'profile' ? <Blocks blocks={COMPANY_PROFILE} lang={lang} /> : null}
      {section === 'values' ? <Blocks blocks={CORE_VALUES} lang={lang} /> : null}
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
