import type { LostFoundCategory, LostFoundStatus, LostFoundValueTier } from './lostFoundDemoData'

export { formatReportDate as formatLostFoundDate } from '@/features/operations/dailyUpdates/dailyUpdateFormat'

export const LOST_FOUND_CATEGORY_LABELS: Record<LostFoundCategory, string> = {
  electronics: 'Electronics',
  wallet: 'Wallet',
  bag: 'Bag',
  clothing: 'Clothing',
  jewelry: 'Jewelry',
  documents: 'Documents',
  keys: 'Keys',
  eyewear: 'Eyewear',
  other: 'Other',
}

export const LOST_FOUND_STATUS_LABELS: Record<LostFoundStatus, string> = {
  logged: 'Logged',
  claimPending: 'Claim Pending',
  returned: 'Returned',
  unclaimed: 'Unclaimed',
  disposed: 'Disposed',
  donated: 'Donated',
}

export const LOST_FOUND_STATUS_VARIANT: Record<LostFoundStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  logged: 'info',
  claimPending: 'warning',
  returned: 'success',
  unclaimed: 'error',
  disposed: 'neutral',
  donated: 'neutral',
}

export const VALUE_TIER_LABELS: Record<LostFoundValueTier, string> = {
  low: 'Low value',
  medium: 'Medium value',
  high: 'High value',
}

export const VALUE_TIER_VARIANT: Record<LostFoundValueTier, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  low: 'neutral',
  medium: 'warning',
  high: 'error',
}
