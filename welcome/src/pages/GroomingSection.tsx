import { useEffect, useState } from 'react'
import {
  BadgeIcon,
  Button,
  Card,
  ChevronIcon,
  Collapsible,
  HandshakeIcon,
  ImagePlaceholder,
  SegmentedToggle,
  ShirtIcon,
  SparkleIcon,
} from '../ui'
import {
  GROOMING_CONTENT,
  type GroomingCategory,
  type GroomingLeaf,
  type GroomingPosition,
} from '../content/grooming'
import { OPTIONS, STRINGS, t, type Lang, type Pair } from '../strings'

/**
 * Grooming Standard renderer (§7.4, replaced 2026-09-26) — split out of
 * `SectionPage.tsx` into its own file, unlike Company Profile/Core Values,
 * because of size: 11 positions × up to 2 gender variants, plus ~20 Personal
 * Grooming/Uniform & Accessories leaves. See `content/grooming.ts` for the
 * data shape this renders.
 *
 * Takes no `content` prop — static bundled content, same as Company Profile
 * and Core Values, not Firestore-backed.
 *
 * Navigation (category list → category detail, and a separate position list →
 * position detail with a Male/Female toggle) is local component state, not a
 * new `SectionKey` or route — the app has no sub-navigation concept anywhere
 * else, and this section doesn't need one either.
 */

type View =
  | { kind: 'home' }
  | { kind: 'category'; id: string }
  | { kind: 'positions' }
  | { kind: 'position'; id: string; gender: 'male' | 'female' }

const CATEGORY_ICONS: Record<GroomingCategory['icon'], React.ReactNode> = {
  handshake: HandshakeIcon,
  sparkle: SparkleIcon,
  shirt: ShirtIcon,
}

export function GroomingSection({ lang }: { lang: Lang }) {
  const [view, setView] = useState<View>({ kind: 'home' })

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [view])

  if (view.kind === 'position') {
    const position = GROOMING_CONTENT.positions.find((item) => item.id === view.id)
    if (!position) return null
    return (
      <GroomingPositionDetail
        position={position}
        gender={view.gender}
        lang={lang}
        onGenderChange={(gender) => setView({ kind: 'position', id: view.id, gender })}
        onBack={() => setView({ kind: 'positions' })}
      />
    )
  }

  if (view.kind === 'positions') {
    return (
      <GroomingPositionList
        lang={lang}
        onSelect={(position) =>
          setView({ kind: 'position', id: position.id, gender: position.male ? 'male' : 'female' })
        }
        onBack={() => setView({ kind: 'home' })}
      />
    )
  }

  if (view.kind === 'category') {
    const category = GROOMING_CONTENT.categories.find((item) => item.id === view.id)
    if (!category) return null
    return <GroomingCategoryDetail category={category} lang={lang} onBack={() => setView({ kind: 'home' })} />
  }

  const c = GROOMING_CONTENT
  return (
    <div className="flex flex-col gap-3">
      <Card index={0}>
        <p className="text-center text-base font-semibold italic text-[var(--w-amber)]">{t(c.slogan, lang)}</p>
      </Card>

      <Card index={1}>
        <h2 className="mb-2 font-semibold">{t(c.definitionHeading, lang)}</h2>
        <p className="text-sm leading-relaxed text-[var(--w-cream-soft)]">{t(c.definition, lang)}</p>
      </Card>

      {c.categories.map((category, index) => (
        <CategoryCard key={category.id} index={index + 2} onClick={() => setView({ kind: 'category', id: category.id })}>
          <CategoryCardBody icon={CATEGORY_ICONS[category.icon]} title={t(category.heading, lang)} />
        </CategoryCard>
      ))}

      <CategoryCard index={c.categories.length + 2} onClick={() => setView({ kind: 'positions' })}>
        <CategoryCardBody icon={BadgeIcon} title={t(c.positionsHeading, lang)} />
      </CategoryCard>
    </div>
  )
}

function CategoryCard({
  index,
  onClick,
  children,
}: {
  index: number
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onClick} className="w-focusable block w-full text-left">
      <Card index={index}>{children}</Card>
    </button>
  )
}

function CategoryCardBody({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/5 text-[var(--w-amber)]">
        {icon}
      </span>
      <span className="flex-1 font-semibold">{title}</span>
      <span className="flex-none rotate-[-90deg] text-[var(--w-cream-faint)]">{ChevronIcon}</span>
    </div>
  )
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" className="self-start" onClick={onClick}>
      ← {label}
    </Button>
  )
}

function NotesList({ notes, lang }: { notes: Pair[]; lang: Lang }) {
  return (
    <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-[var(--w-cream-soft)]">
      {notes.map((note, index) => (
        <li key={index} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--w-amber)]" />
          <span>{t(note, lang)}</span>
        </li>
      ))}
    </ul>
  )
}

/** A leaf's optional image + collapsible notes — the one repeated unit every category/position uses. */
function LeafBody({ leaf, alt, lang }: { leaf: GroomingLeaf; alt: string; lang: Lang }) {
  return (
    <div className="flex flex-col gap-3">
      {leaf.hasImage ? (
        <ImagePlaceholder imageUrl={leaf.imageUrl} alt={alt} caption={t(STRINGS.photoComingSoon, lang)} />
      ) : null}
      <Collapsible closedLabel={t(STRINGS.showNotes, lang)} openLabel={t(STRINGS.hideNotes, lang)}>
        <NotesList notes={leaf.notes} lang={lang} />
      </Collapsible>
    </div>
  )
}

function GroomingCategoryDetail({
  category,
  lang,
  onBack,
}: {
  category: GroomingCategory
  lang: Lang
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <BackButton label={t(STRINGS.secGrooming, lang)} onClick={onBack} />
      <h2 className="px-1 text-lg font-bold">{t(category.heading, lang)}</h2>

      {category.subcategories.map((subcategory, index) => {
        const showLeafNames = subcategory.leaves.length > 1 || Boolean(subcategory.leaves[0]?.name)
        return (
          <Card key={subcategory.id} index={index}>
            <h3 className="mb-3 font-semibold">{t(subcategory.heading, lang)}</h3>
            <div className="flex flex-col gap-4 divide-y divide-white/10">
              {subcategory.leaves.map((leaf, leafIndex) => (
                <div key={leafIndex} className={leafIndex === 0 ? '' : 'pt-4'}>
                  {showLeafNames && leaf.name ? (
                    <p className="mb-2 text-sm font-semibold text-[var(--w-cream)]">{t(leaf.name, lang)}</p>
                  ) : null}
                  <LeafBody
                    leaf={leaf}
                    alt={leaf.name ? t(leaf.name, lang) : t(subcategory.heading, lang)}
                    lang={lang}
                  />
                </div>
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function GroomingPositionList({
  lang,
  onSelect,
  onBack,
}: {
  lang: Lang
  onSelect: (position: GroomingPosition) => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <BackButton label={t(STRINGS.secGrooming, lang)} onClick={onBack} />
      <h2 className="px-1 text-lg font-bold">{t(GROOMING_CONTENT.positionsHeading, lang)}</h2>
      <Card index={0}>
        <ul className="flex flex-col divide-y divide-white/10">
          {GROOMING_CONTENT.positions.map((position) => (
            <li key={position.id}>
              <button
                type="button"
                onClick={() => onSelect(position)}
                className="w-focusable flex min-h-[48px] w-full items-center justify-between gap-2 rounded py-2.5 text-left"
              >
                <span className="font-medium text-[var(--w-cream)]">{t(position.name, lang)}</span>
                <span className="flex-none rotate-[-90deg] text-[var(--w-cream-faint)]">{ChevronIcon}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function GroomingPositionDetail({
  position,
  gender,
  lang,
  onGenderChange,
  onBack,
}: {
  position: GroomingPosition
  gender: 'male' | 'female'
  lang: Lang
  onGenderChange: (gender: 'male' | 'female') => void
  onBack: () => void
}) {
  const hasBoth = Boolean(position.male) && Boolean(position.female)
  const variant = (gender === 'male' ? position.male : position.female) ?? position.male ?? position.female
  if (!variant) return null

  return (
    <div className="flex flex-col gap-3">
      <BackButton label={t(GROOMING_CONTENT.positionsHeading, lang)} onClick={onBack} />
      <h2 className="px-1 text-lg font-bold">{t(position.name, lang)}</h2>

      {hasBoth ? (
        <SegmentedToggle
          value={gender}
          onChange={onGenderChange}
          ariaLabel={t(STRINGS.gender, lang)}
          options={OPTIONS.gender.map((option) => ({ value: option.value, label: t(option.label, lang) }))}
        />
      ) : null}

      <Card index={0}>
        <LeafBody leaf={variant} alt={t(position.name, lang)} lang={lang} />
      </Card>
    </div>
  )
}
