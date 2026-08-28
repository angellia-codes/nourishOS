import { CalendarClock, CheckCircle2, XCircle, type LucideIcon } from 'lucide-react'
import type { StatusTone } from '@/components/ui'
import type { EngagementStatus } from '@/types'

export const ENGAGEMENT_STATUS_LABELS: Record<EngagementStatus, string> = {
  planned: 'Planned',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const ENGAGEMENT_STATUS_TONE: Record<EngagementStatus, StatusTone> = {
  planned: 'info',
  completed: 'success',
  cancelled: 'neutral',
}

export const ENGAGEMENT_STATUS_ICON: Record<EngagementStatus, LucideIcon> = {
  planned: CalendarClock,
  completed: CheckCircle2,
  cancelled: XCircle,
}

/** IDR has no minor unit in practice — matches expenseFormat.ts's/inventoryFormat.ts's formatter. */
export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}
