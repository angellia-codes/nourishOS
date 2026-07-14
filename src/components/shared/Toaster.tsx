import { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore, type Toast, type ToastVariant } from '@/store'

const AUTO_DISMISS_MS = 5000

const VARIANT_CONFIG: Record<ToastVariant, { icon: LucideIcon; classes: string }> = {
  success: { icon: CheckCircle2, classes: 'border-success/30 text-success' },
  error: { icon: XCircle, classes: 'border-destructive/30 text-destructive' },
  warning: { icon: AlertTriangle, classes: 'border-warning/30 text-warning' },
  info: { icon: Info, classes: 'border-info/30 text-info' },
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const { icon: Icon, classes } = VARIANT_CONFIG[toast.variant]

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [toast.id, removeToast])

  return (
    <div role="status" className={cn('flex items-start gap-3 rounded-lg border bg-surface p-4 shadow-dialog', classes)}>
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm text-foreground">{toast.message}</p>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        aria-label="Dismiss"
        className="text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed inset-x-4 top-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-96" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
