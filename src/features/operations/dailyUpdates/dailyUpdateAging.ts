import type { BadgeProps } from '@/components/ui'

/** daily-updates.md §5 aging bands — days open since a dailyUpdate task was first raised. */
export function agingLabel(daysOpen: number): string {
  if (daysOpen <= 3) return 'Normal'
  if (daysOpen <= 7) return 'Warning'
  if (daysOpen <= 14) return 'High Attention'
  return 'Critical'
}

export function agingBadgeVariant(daysOpen: number): NonNullable<BadgeProps['variant']> {
  if (daysOpen <= 3) return 'success'
  if (daysOpen <= 7) return 'warning'
  if (daysOpen <= 14) return 'warning'
  return 'error'
}
