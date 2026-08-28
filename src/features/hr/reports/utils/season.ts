export type Season = 'low' | 'high'

/**
 * Fixed calendar-month mapping — confirmed decision, no schema change. Bali
 * tourism high season runs roughly Jun-Sep plus the Dec-Jan holiday peak; the
 * rest of the year is low season. Applied purely by month number, not stored
 * anywhere per-record.
 */
export const SEASON_BY_MONTH: Record<number, Season> = {
  1: 'high',
  2: 'low',
  3: 'low',
  4: 'low',
  5: 'low',
  6: 'high',
  7: 'high',
  8: 'high',
  9: 'high',
  10: 'low',
  11: 'low',
  12: 'high',
}

/** `periodMonth` is 'YYYY-MM'. */
export function seasonForPeriod(periodMonth: string): Season {
  return SEASON_BY_MONTH[Number(periodMonth.slice(5, 7))] ?? 'low'
}
