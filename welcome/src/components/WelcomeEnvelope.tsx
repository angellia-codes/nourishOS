import { useEffect, useRef, useState } from 'react'
import { Chip, CheckIcon, ClockIcon } from '../ui'
import { STRINGS, fill, t, type Lang } from '../strings'
import { hasOpenedEnvelope, markEnvelopeOpened } from '../token'

/**
 * welcome-portal.md §7.2 — the welcome banner, framed as an envelope-opening
 * interaction rather than a plain card.
 *
 * Tap the kraft envelope: the flap swings back, the seal shrinks away, a
 * ticket-shaped glass card rises out, the headline enters word by word, and
 * the status chip settles in last. The choreography and its timings come
 * straight from the prototype the spec links; the CSS lives in glass.css.
 *
 * The spec flags one behaviour as an unconfirmed assumption and this is the
 * reading it takes: the ceremony plays **once**, on the first arrival after
 * submit. Checking your status on day nine should not mean tapping an envelope
 * again, so a `localStorage` flag opens it directly on every later visit.
 */
export function WelcomeEnvelope({
  fullName,
  verified,
  lang,
}: {
  fullName: string
  verified: boolean
  lang: Lang
}) {
  // Read once, at mount: flipping this mid-session would re-animate the card
  // under the hire while they are reading it.
  const [open, setOpen] = useState(() => hasOpenedEnvelope())
  const cardRef = useRef<HTMLElement>(null)
  const reduceMotion = usePrefersReducedMotion()

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    markEnvelopeOpened()
    // Move focus into the card once it has arrived, so a screen reader hears
    // the greeting rather than being left on the envelope button.
    window.setTimeout(() => cardRef.current?.focus(), reduceMotion ? 50 : 680)
  }

  const headline = fill(t(STRINGS.welcomeTo, lang), { name: fullName })
  const words = headline.split(' ')

  return (
    <div className={`w-stage ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="w-envelope"
        aria-expanded={open}
        aria-controls="welcome-card"
        aria-label={t(STRINGS.envelopeHint, lang)}
        onClick={toggle}
      >
        <span className="w-env-shadow" />
        <span className="w-env-back" />
        <span className="w-env-pocket" />
        <span className="w-env-flap" />
        <span className="w-env-seal" aria-hidden="true">
          ✉
        </span>
      </button>

      <section
        ref={cardRef}
        id="welcome-card"
        className="w-ticket"
        tabIndex={-1}
        aria-hidden={!open}
        aria-live="polite"
      >
        <span className="w-ticket-teeth" aria-hidden="true" />
        <h1 className="mb-4 text-[clamp(21px,6.2vw,27px)] font-bold leading-tight tracking-tight">
          {/* Word by word, each 70ms after the last. Re-keyed on the name so a
              late-arriving fullName replays cleanly rather than half-animating. */}
          {words.map((word, index) => (
            <span
              key={`${fullName}-${index}`}
              className="w-word"
              style={{ '--i': index } as React.CSSProperties}
            >
              {word}
              {index < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </h1>

        <Chip
          className="w-chip-in"
          tone={verified ? 'done' : 'pending'}
          icon={verified ? CheckIcon : ClockIcon}
          label={t(verified ? STRINGS.chipVerified : STRINGS.chipSubmitted, lang)}
        />

        <div className="w-note-in mt-4 text-[12.5px] leading-relaxed text-[var(--w-cream-soft)]">
          <p>{t(STRINGS.bannerNote, lang)}</p>
          <p className="mt-3 font-semibold text-[var(--w-cream)]">{t(STRINGS.bannerSignerName, lang)}</p>
          <p className="text-[11.5px]">{t(STRINGS.bannerSignerTitle, lang)}</p>
        </div>
      </section>
    </div>
  )
}

/** Live, because a hire may turn the setting on mid-session. */
function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduce(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduce
}
