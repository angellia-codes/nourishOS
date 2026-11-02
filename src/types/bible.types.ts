import type { BaseDocument } from './firestore.types'

/**
 * Nourish's Bible (nourish-bible.md §7). Mirrors
 * functions/src/documents/bible/edition.ts — the reader only ever sees the
 * compiled edition, so the edition's embedded records carry content fields
 * and an id, not the audit fields of the source documents.
 */

export type MenuGroup = 'food' | 'beverage'
export type MenuOwner = 'kitchen' | 'bar' | 'bakery'
export type DietaryTag = 'V' | 'VG' | 'GF' | 'VO'

export interface BibleMenuCategory {
  id: string
  label: string
  group: MenuGroup
  owner: MenuOwner
  servingHours: string | null
  note: string | null
  sortOrder: number
}

export interface BiblePrice {
  label: string | null
  amount: number // whole rupiah
}

export interface BibleServiceNotes {
  howToExplain: string
  pairing: string
  upsell: string
  guestQuestions: string
}

export interface BibleMenuItem {
  id: string
  itemCode: string
  categoryId: string
  owner: MenuOwner
  name: string
  description: string
  tags: DietaryTag[]
  prices: BiblePrice[]
  photoFileId: string | null
  serviceNotes: BibleServiceNotes | null
  needsNotes: boolean
  needsRecipe: boolean
  sortOrder: number
}

export interface BibleBilingual {
  id: string
  en: string
}

export interface BibleContent {
  id: string
  kind: 'grooming' | 'sequenceOfService'
  scope: 'frontOfHouse' | 'backOfHouse' | 'floor' | 'cashier'
  heading: BibleBilingual
  blocks: Array<{ label: BibleBilingual; body: BibleBilingual }>
  photoFileId: string | null
}

export interface BibleEdition extends BaseDocument {
  editionNumber: number
  publishedAt: string
  publishedBy: string
  changeRequestId: string | null
  categories: BibleMenuCategory[]
  items: BibleMenuItem[]
  content: BibleContent[]
}

/** systemSettings/bibleEdition */
export interface BibleEditionPointer extends BaseDocument {
  currentEditionId: string
}

/** bibleOutletMenus/{outletId} — one per restaurant outlet. */
export interface BibleOutletMenu extends BaseDocument {
  soldItemIds: string[]
  priceOverrides: Record<string, BiblePrice[]>
}

/** getBibleAccess — a display aid, not enforcement (§6.4). */
export interface BibleAccess {
  menuOnly: boolean
  recipeOwners: MenuOwner[]
}
