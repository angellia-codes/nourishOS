import { Check, Clock, AlertTriangle, AlertOctagon, type LucideIcon } from 'lucide-react'
import type { StatusTone } from '@/components/ui'

/** daily-updates.md §5 aging bands — days open since a dailyUpdate task was first raised. */
export function agingLabel(daysOpen: number): string {
  if (daysOpen <= 3) return 'Normal'
  if (daysOpen <= 7) return 'Warning'
  if (daysOpen <= 14) return 'High Attention'
  return 'Critical'
}

export function agingTone(daysOpen: number): StatusTone {
  if (daysOpen <= 3) return 'success'
  if (daysOpen <= 14) return 'warning'
  return 'error'
}

export function agingIcon(daysOpen: number): LucideIcon {
  if (daysOpen <= 3) return Check
  if (daysOpen <= 7) return Clock
  if (daysOpen <= 14) return AlertTriangle
  return AlertOctagon
}
