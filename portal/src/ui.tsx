import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

/**
 * The portal's entire component set. Native elements styled with the Basalt
 * tokens the NourishOS app already defines — no component library, and no
 * import from src/, which stays private to the internal app.
 */

const CONTROL =
  'h-12 w-full rounded-md border border-border bg-sunken px-3 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-surface p-5 shadow-sm ${className}`}>{children}</div>
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  loading,
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  loading?: boolean
}) {
  const styles = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    secondary: 'border border-border bg-sunken text-foreground hover:bg-background',
    ghost: 'text-muted-foreground hover:text-foreground',
  }[variant]

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex h-12 items-center justify-center rounded-md px-5 text-base font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {loading ? 'Working…' : children}
    </button>
  )
}

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-error"> *</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={CONTROL} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={CONTROL} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${CONTROL} h-auto py-2`} />
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: ReactNode
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 rounded border-border accent-[var(--color-primary)]"
      />
      <span>{label}</span>
    </label>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: ReactNode }) {
  const styles = {
    info: 'border-border bg-sunken text-muted-foreground',
    error: 'border-error/40 bg-error/5 text-error',
    success: 'border-success/40 bg-success/5 text-success',
  }[tone]
  return <p className={`rounded-md border px-3 py-2 text-sm ${styles}`}>{children}</p>
}

/** Repeatable rows (education, work history…) — §7 AC-4 forbids fixed row counts. */
export function RowList({
  title,
  rows,
  onAdd,
  onRemove,
  children,
}: {
  title: string
  rows: unknown[]
  onAdd: () => void
  onRemove: (index: number) => void
  children: (index: number) => ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <Button variant="secondary" onClick={onAdd}>
          Add
        </Button>
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">None added.</p>}
      {rows.map((_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-md border border-border p-3">
          {children(index)}
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => onRemove(index)}>
              Remove
            </Button>
          </div>
        </div>
      ))}
    </section>
  )
}
