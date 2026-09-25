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

export function Spinner() {
  return (
    <span
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--w-cream-faint)] border-t-[var(--w-amber)]"
      role="status"
      aria-label="Loading"
    />
  )
}
