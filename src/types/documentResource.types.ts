import type { BaseDocument } from './firestore.types'

/** Company Forms — FEATURE_SPECIFICATIONS.md Module 4. Curated download-link register, same shape as Sop. */
export interface DocumentResource extends BaseDocument {
  title: string
  category: string
  driveUrl: string
}
