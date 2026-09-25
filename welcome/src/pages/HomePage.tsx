import { Button, Card, DrawnCheck, Notice } from '../ui'
import { WelcomeEnvelope } from '../components/WelcomeEnvelope'
import { FIRST_WEEK } from '../content/static'
import { STRINGS, t, type Lang } from '../strings'

/**
 * welcome-portal.md §7.3 — "Home order: banner → 'Your first week' checklist →
 * section cards".
 *
 * Feedback is the spec's own last block on this page and is deliberately
 * absent: it was scoped out of this pass along with `onboardingFeedback`,
 * `onboardingFeedbackSummary` and the aggregation job. Nothing here depends on
 * it, and the Feedback tab is missing from the nav for the same reason.
 */

export interface HomeSection {
  key: string
  title: string
  blurb: string
}

export function HomePage({
  fullName,
  verified,
  rejectionReason,
  lang,
  sections,
  onOpenSection,
  onOpenForm,
}: {
  fullName: string
  verified: boolean
  rejectionReason: string | null
  lang: Lang
  sections: HomeSection[]
  onOpenSection: (key: string) => void
  onOpenForm: () => void
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-8 pt-4">
      <WelcomeEnvelope fullName={fullName} verified={verified} lang={lang} />

      {/* §3.4 — a rejection re-opens the form, so the way back has to be here. */}
      {rejectionReason ? (
        <Card index={0}>
          <Notice tone="error">{t(STRINGS.rejectedNote, lang)}</Notice>
          <p className="mt-3 text-sm text-[var(--w-cream-soft)]">{rejectionReason}</p>
          <Button className="mt-4" onClick={onOpenForm}>
            {t(STRINGS.openForm, lang)}
          </Button>
        </Card>
      ) : null}

      <Card index={1}>
        <div className="flex items-start gap-3">
          <DrawnCheck size={28} />
          <div>
            <h2 className="text-lg font-semibold">{t(STRINGS.firstWeek, lang)}</h2>
            <p className="text-sm text-[var(--w-cream-soft)]">{t(STRINGS.firstWeekIntro, lang)}</p>
          </div>
        </div>
        <ul className="mt-4 flex flex-col gap-2.5">
          {FIRST_WEEK.map((item, index) => (
            <li key={index} className="flex gap-3 text-sm">
              <span className="w-mono mt-0.5 flex-none text-xs text-[var(--w-amber)]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-[var(--w-cream-soft)]">{t(item, lang)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div>
        <h2 className="mb-3 px-1 text-lg font-semibold">{t(STRINGS.readSections, lang)}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map((section, index) => (
            <button
              key={section.key}
              type="button"
              onClick={() => onOpenSection(section.key)}
              className="w-glass w-focusable w-rise p-4 text-left"
              style={{ '--i': index + 2 } as React.CSSProperties}
            >
              <p className="font-semibold">{section.title}</p>
              <p className="mt-1 text-sm text-[var(--w-cream-soft)]">{section.blurb}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
