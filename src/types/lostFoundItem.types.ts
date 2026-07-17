import type { Timestamp } from 'firebase/firestore'
import type { BaseDocument } from './firestore.types'

/** lost-and-found-report.md §4 — category. */
export type LostFoundCategory =
  | 'electronics'
  | 'wallet'
  | 'bag'
  | 'clothing'
  | 'jewelry'
  | 'documents'
  | 'keys'
  | 'eyewear'
  | 'other'

export type LostFoundValueTier = 'low' | 'medium' | 'high'

/** lost-and-found-report.md §4 / §6 — status lifecycle. */
export type LostFoundStatus = 'logged' | 'claimPending' | 'returned' | 'unclaimed' | 'disposed' | 'donated'

export type LostFoundDisposalMethod = 'donated' | 'discarded' | 'handedToAuthorities'

/**
 * Found item log — lost-and-found-report.md §4. The spec's schema lists an
 * `attachments: string[]` field, but this repo's established convention
 * (FILE_STORAGE.md §15, mirrored by PatrolLog/Appraisal/Employee) is that
 * business documents never store file references inline — clients query
 * `files` by `resourceType`/`resourceId` instead. Deliberately deviating
 * from the doc schema here to stay consistent with shipped code.
 */
export interface LostFoundItem extends BaseDocument {
  /** Auto-generated server-side: LF-2026-0001. */
  itemNumber: string

  itemDescription: string
  category: LostFoundCategory
  valueTier: LostFoundValueTier

  foundLocation: string
  foundAt: string // ISO date
  foundBy: string // uid
  storageLocation: string
  linkedIncidentId?: string | null

  /** Overrides BaseDocument's generic status with this module's lifecycle. */
  status: LostFoundStatus

  claimantName?: string | null
  claimantPhone?: string | null
  claimantEmail?: string | null
  claimantCustomerId?: string | null
  identifyingDetailsGiven?: string | null
  idVerified?: boolean | null
  /** Server timestamp of the moment the item was actually handed back — not a civil date like foundAt. */
  returnedAt?: Timestamp | null
  returnedBy?: string | null

  retentionExpiresAt: string // ISO date
  disposalMethod?: LostFoundDisposalMethod | null
  disposalNotes?: string | null
  disposedAt?: Timestamp | null
  disposedBy?: string | null

  /** Set once by checkLostFoundRetention so the "7 days out" notice fires only once. */
  retentionWarnedAt?: Timestamp | null
}
