import * as React from 'react'

/**
 * The welcome app's whole component set — glass surfaces over the Basalt
 * tokens, styled with the classes in glass.css. Native elements only, the same
 * convention src/components/ui/ follows: no Radix, no headless-component
 * dependency, and nothing imported from the internal app.
 *
 * Every control here is at least 48px tall with 16px text (welcome-portal.md
 * §9), which is also what stops iOS Safari zooming the page on focus.
 */

export function Card({
  children,
  className = '',
  index,
}: {
  children: React.ReactNode
  className?: string
  /** Staggered reveal position (§9). Omit for a card that should not animate. */
  index?: number
}) {
  return (
    <section
      className={`w-glass p-5 ${index === undefined ? '' : 'w-rise'} ${className}`}
      style={index === undefined ? undefined : ({ '--i': index } as React.CSSProperties)}
    >
      {children}
    </section>
  )
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  const base =
    'w-focusable inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-opacity disabled:opacity-50'
  // Deliberately no fixed width anywhere — Indonesian labels run long (§9).
  const tone =
    variant === 'primary'
      ? 'bg-[var(--w-amber)] text-[var(--w-ink)]'
      : 'border border-[var(--w-glass-border)] bg-white/5 text-[var(--w-cream)]'
  return (
    <button type="button" className={`${base} ${tone} ${className}`} {...rest}>
      {children}
    </button>
  )
}

export function Field({
  label,
  hint,
  error,
  optional,
  children,
  htmlFor,
}: {
  label: string
  hint?: string
  error?: string
  optional?: string
  children: React.ReactNode
  htmlFor?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--w-cream)]">
        {label}
        {optional ? <span className="ml-1.5 font-normal text-[var(--w-cream-soft)]">({optional})</span> : null}
      </label>
      {children}
      {/* Errors are per field and say what to fix (§11). */}
      {error ? (
        <p className="text-sm font-medium text-[var(--w-error)]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-[var(--w-cream-soft)]">{hint}</p>
      ) : null}
    </div>
  )
}

export function Input({
  mono,
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  return <input className={`w-control ${mono ? 'w-mono' : ''} ${className}`} {...rest} />
}

export function Textarea({ className = '', ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} className={`w-control ${className}`} {...rest} />
}

export function Select({
  children,
  className = '',
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`w-control w-select ${className}`} {...rest}>
      {children}
    </select>
  )
}

/**
 * §9 — "Status never conveyed by colour alone (icon + shape + text)." The
 * dashed outline on a pending chip and the solid fill on a verified one carry
 * the same distinction as the icon and the words.
 */
export function Chip({
  tone,
  icon,
  label,
  className = '',
}: {
  tone: 'pending' | 'done'
  icon: React.ReactNode
  label: string
  className?: string
}) {
  const style =
    tone === 'done'
      ? 'bg-[var(--w-olive)] border border-transparent text-[var(--w-cream)]'
      : 'bg-transparent border-[1.5px] border-dashed border-[var(--w-amber-dim)] text-[var(--w-amber)]'
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-semibold ${style} ${className}`}>
      <span className="flex flex-none">{icon}</span>
      <span>{label}</span>
    </span>
  )
}

/** §7.1/§9 — the primary action lives in a sticky bottom bar, above the home indicator. */
export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-[var(--w-glass-border)] bg-[var(--w-glass-strong)] px-4 pt-3 backdrop-blur-md"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3">{children}</div>
    </div>
  )
}

export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error'
  children: React.ReactNode
}) {
  const style =
    tone === 'error'
      ? 'border-[var(--w-error)]/50 bg-[var(--w-error)]/10 text-[var(--w-error)]'
      : 'border-[var(--w-glass-border)] bg-white/5 text-[var(--w-cream-soft)]'
  return <p className={`rounded-xl border px-4 py-3 text-sm ${style}`}>{children}</p>
}

/** INSPIRE core values (§7.4, replaced 2026-09-26) — one icon per value. */
export const ShieldIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <path
      d="M10 2.5l6 2.2v4.6c0 4-2.6 6.9-6 8.2-3.4-1.3-6-4.2-6-8.2V4.7l6-2.2z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M7.2 10.1l1.9 1.9 3.7-3.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const HeartIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <path
      d="M10 17S2.8 12.6 2.8 7.6a3.7 3.7 0 016.9-1.9A3.7 3.7 0 0117.2 7.6C17.2 12.6 10 17 10 17z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
)

export const SparkleIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <path
      d="M10 2.5l1.3 4.4L15.7 8l-4.4 1.3L10 13.7 8.7 9.3 4.3 8l4.4-1.3L10 2.5z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path d="M15.5 12.5l.6 2 2 .6-2 .6-.6 2-.6-2-2-.6 2-.6.6-2z" fill="currentColor" />
  </svg>
)

export const BadgeIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <circle cx="10" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7.2 12.3L6.3 17.5 10 15.4l3.7 2.1-.9-5.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
)

export const BulbIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <path
      d="M10 2.8a5 5 0 00-2.8 9.1c.5.4.8 1 .8 1.6v.5h4v-.5c0-.6.3-1.2.8-1.6A5 5 0 0010 2.8z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M8 16.5h4M8.5 18h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const HandshakeIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <path
      d="M2.5 9.5l3-2.7 3 2 2.3-2.3 3 1.9 3.7-2.4M2.5 9.5l3.2 4 2-1.2 1.7 1.9 2-1.1 1.6 1.6 2-1.2 2.5-3"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const MedalIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <circle cx="10" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8.4 7.6L6.8 2.5M11.6 7.6l1.6-5.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M8.6 12l1 1 2-2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ClockIcon = (
  <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.6" />
    <path d="M10 6.2V10l2.6 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const CheckIcon = (
  <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
    <path d="M4.5 10.4l3.4 3.4 7.6-7.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** The drawn checkmark from §9's motion inventory. */
export function DrawnCheck({ size = 48 }: { size?: number }) {
  return (
    <svg className="w-check" viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path
        d="M4 12.5l5 5 11-11"
        stroke="var(--w-amber)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const LeafIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <path
      d="M4 16c-1-5 1.5-10.5 11-11.5C16 13.5 10.5 16.5 4 16z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M4.5 15.5L13 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const EyeIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <path
      d="M1.5 10S4.7 4 10 4s8.5 6 8.5 6-3.2 6-8.5 6S1.5 10 1.5 10z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

export const TargetIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="10" cy="10" r="0.9" fill="currentColor" />
  </svg>
)

export const StoreIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <path
      d="M3 8.2L3.8 3.8h12.4L17 8.2M3 8.2v8h14v-8M3 8.2a2.3 2.3 0 004.6 0 2.3 2.3 0 004.6 0 2.3 2.3 0 004.6 0"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8 16.2v-4.4h4v4.4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
)

export const BagIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <path
      d="M5 7h10l.8 9.5a1.5 1.5 0 01-1.5 1.7H5.7A1.5 1.5 0 014.2 16.5L5 7z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path d="M7 7V5.5a3 3 0 016 0V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

export const PinIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <path
      d="M10 18s6-5.6 6-10.2A6 6 0 004 7.8C4 12.4 10 18 10 18z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="7.8" r="2.1" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

export const PhoneIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <path
      d="M4.8 3.2h2.6l1 3.6-1.7 1.5a10 10 0 004.9 4.9l1.5-1.7 3.6 1v2.6c0 .9-.8 1.6-1.7 1.5C8.7 15.7 4.3 11.3 3.3 4.9c-.1-.9.6-1.7 1.5-1.7z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
)

export const MailIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M3 5.5l7 5.5 7-5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const InstagramIcon = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <rect x="2.5" y="2.5" width="15" height="15" rx="4" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="10" cy="10" r="3.4" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="14" cy="6" r="0.9" fill="currentColor" />
  </svg>
)

const ImageIcon = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
    <rect x="3" y="4.5" width="18" height="15" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="8.5" cy="9.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
    <path d="M3.5 16l5-5 4 4 3-3 4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * A slot for a photo that does not exist yet — HR drops the real file in
 * later by giving this an `imageUrl`. Renders the placeholder whenever one
 * isn't set, the same fallback shape `SectionPage.tsx`'s `OrgChart` already
 * uses for `welcomeContent`'s own images.
 */
export function ImagePlaceholder({
  imageUrl,
  alt,
  caption,
  className = '',
}: {
  imageUrl?: string
  alt: string
  caption?: string
  className?: string
}) {
  if (imageUrl) {
    return <img src={imageUrl} alt={alt} className={`aspect-[4/3] w-full rounded-xl object-cover ${className}`} />
  }
  return (
    <div
      className={`flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--w-glass-border)] bg-white/5 text-[var(--w-cream-faint)] ${className}`}
    >
      {ImageIcon}
      {caption ? <span className="px-3 text-center text-xs">{caption}</span> : null}
    </div>
  )
}

export function Spinner() {
  return (
    <span
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--w-cream-faint)] border-t-[var(--w-amber)]"
      role="status"
      aria-label="Loading"
    />
  )
}
