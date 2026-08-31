import { callFunction } from '@/services/api'
import { subscribeToCollection, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Unsubscribe } from '@/services/firestore'
import type { MonthlyRevenue } from '@/types'

/** Company-wide total, entered as one figure instead of nine per-outlet ones. Not a real outlet id. */
export const ALL_OUTLETS_ID = 'all'

export interface RecordMonthlyRevenueInput {
  outletId: string
  periodMonth: string
  amount: number
}

export function recordMonthlyRevenue(input: RecordMonthlyRevenueInput): Promise<void> {
  return callFunction('recordMonthlyRevenue', input)
}

export function subscribeToMonthlyRevenue(
  onChange: (records: MonthlyRevenue[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<MonthlyRevenue>(
    COLLECTIONS.MONTHLY_REVENUE,
    [orderBy('periodMonth', 'desc')],
    onChange,
    onError,
  )
}
