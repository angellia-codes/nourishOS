import type { Timestamp } from 'firebase/firestore'

/**
 * Standard fields every operational Firestore document carries.
 * Source: DATABASE.md §5, FIRESTORE_SCHEMA.md §3.
 *
 * outletId/departmentId are optional at the type level because a few
 * collections (e.g. company-wide settings) are genuinely global — but
 * any collection tied to day-to-day operations should populate both.
 */
export interface BaseDocument {
  id: string
  createdAt: Timestamp
  createdBy: string
  updatedAt: Timestamp
  updatedBy: string
  outletId?: string
  departmentId?: string
  status: string
  isArchived: boolean
}

/** Fields the client is allowed to send when creating a document — server stamps the rest. */
export type CreateInput<T extends BaseDocument> = Omit<
  T,
  'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isArchived'
>

/** Fields the client is allowed to send when updating — never id/createdAt/createdBy. */
export type UpdateInput<T extends BaseDocument> = Partial<
  Omit<T, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>
>
