import type { BibleMenuCategory, BibleMenuItem, BibleOutletMenu, BiblePrice, MenuOwner } from '@/types'

/**
 * The book's fixed structure (nourish-bible.md §4, design guide §5.3–5.4).
 * Pure — no React, no Firestore. Pages are addressed by a stable `key`, never
 * by number, so a remembered position or deep link survives menu changes.
 */

export type ChapterId = 'general' | 'service' | 'product' | 'wholefood'
export type SectionId = 'floor' | 'cashier' | 'kitchen' | 'bar' | 'bakery'
export type PageType =
  | 'endpaper' | 'title' | 'contents' | 'opener' | 'toc' | 'profile' | 'values' | 'orgChart' | 'grooming' | 'holidays' | 'forms'
  | 'menu' | 'category' | 'dish' | 'notes' | 'sequence' | 'sop'
  | 'picture' | 'recipe' | 'procedure' | 'soon' | 'back'

export interface BookPage {
  key: string
  type: PageType
  chapter: ChapterId | null
  section: SectionId | null
  number: number
}

export type Spread = [BookPage | null, BookPage | null]

export const CHAPTERS: { id: ChapterId; numeral: number; sections: SectionId[] }[] = [
  { id: 'general', numeral: 1, sections: [] },
  { id: 'service', numeral: 2, sections: ['floor', 'cashier'] },
  { id: 'product', numeral: 3, sections: ['kitchen', 'bar', 'bakery'] },
  { id: 'wholefood', numeral: 4, sections: [] },
]

/** Ownership controls editing and recipes, not reading: Floor and Cashier see every category (§5.1). */
export const SECTION_OWNERS: Record<SectionId, MenuOwner[]> = {
  floor: ['kitchen', 'bar', 'bakery'],
  cashier: ['kitchen', 'bar', 'bakery'],
  kitchen: ['kitchen'],
  bar: ['bar'],
  bakery: ['bakery'],
}

/**
 * SOP Library departments per section. The Bakery maps to `kitchen` because
 * `sops` has no bakery department — its SOPs are the Kitchen ones until the
 * SOP register grows a way to tell them apart. Cashier has none yet (OI-5).
 */
export const SECTION_SOP_DEPARTMENTS: Record<SectionId, string[]> = {
  floor: ['fb_service'],
  cashier: ['cashier'],
  kitchen: ['kitchen', 'central_kitchen'],
  bar: ['bar'],
  bakery: ['kitchen'],
}

/** The three restaurants that share the master menu (D4). Mirrors BIBLE_OUTLETS server-side. */
export const BIBLE_OUTLETS = ['nourish_uluwatu', 'nourish_ungasan', 'nourish_berawa'] as const

const SERVICE_SPREADS: [PageType, PageType][] = [['menu', 'category'], ['dish', 'notes'], ['sequence', 'sop']]
const PRODUCT_SPREADS: [PageType, PageType][] = [['menu', 'category'], ['picture', 'recipe'], ['procedure', 'sop']]

/**
 * Builds the spreads (desktop) and the flat page list (phone, same order).
 * Menu-only staff never get Sequence of Service or SOP pages — they are
 * absent, not hidden, so no tab or key can reach them (§8.3, guide §6).
 */
export function buildBook(menuOnly: boolean): { spreads: Spread[]; pages: BookPage[] } {
  const raw: [Omit<BookPage, 'number'> | null, Omit<BookPage, 'number'> | null][] = []
  const page = (key: string, type: PageType, chapter: ChapterId | null = null, section: SectionId | null = null) => ({ key, type, chapter, section })
  const hidden = (type: PageType) => menuOnly && (type === 'sequence' || type === 'sop')

  raw.push([page('endpaper', 'endpaper'), page('title', 'title')])
  raw.push([page('contents', 'contents'), page('general.opener', 'opener', 'general')])
  raw.push([page('general.profile', 'profile', 'general'), page('general.values', 'values', 'general')])
  raw.push([page('general.orgChart', 'orgChart', 'general'), page('general.grooming', 'grooming', 'general')])
  raw.push([page('general.holidays', 'holidays', 'general'), page('general.forms', 'forms', 'general')])

  for (const chapter of [CHAPTERS[1], CHAPTERS[2]]) {
    raw.push([page(`${chapter.id}.opener`, 'opener', chapter.id), page(`${chapter.id}.toc`, 'toc', chapter.id)])
    const layout = chapter.id === 'service' ? SERVICE_SPREADS : PRODUCT_SPREADS
    for (const section of chapter.sections) {
      for (const [left, right] of layout) {
        const l = hidden(left) ? null : page(`${chapter.id}.${section}.${left}`, left, chapter.id, section)
        const r = hidden(right) ? null : page(`${chapter.id}.${section}.${right}`, right, chapter.id, section)
        if (l || r) raw.push([l, r])
      }
    }
  }

  raw.push([page('wholefood.opener', 'opener', 'wholefood'), page('wholefood.soon', 'soon', 'wholefood')])
  raw.push([page('back', 'back'), null])

  // Kraft pages (endpaper, back cover) are boards, not leaves: they carry no number.
  let number = 0
  const numbered = (p: Omit<BookPage, 'number'> | null) =>
    p && { ...p, number: p.type === 'endpaper' || p.type === 'back' ? 0 : ++number }
  const spreads = raw.map(([l, r]) => [numbered(l), numbered(r)] as Spread)
  const pages = spreads.flatMap((s) => s.filter((p): p is BookPage => p !== null))
  return { spreads, pages }
}

/** §5.3 — staff at a restaurant see that outlet's ticked items at its prices; null = master menu. */
export function mergeOutletView(items: BibleMenuItem[], outletMenu: BibleOutletMenu | null): BibleMenuItem[] {
  if (!outletMenu) return items
  const sold = new Set(outletMenu.soldItemIds ?? [])
  const overrides = outletMenu.priceOverrides ?? {}
  return items.filter((item) => sold.has(item.id)).map((item) => (overrides[item.id] ? { ...item, prices: overrides[item.id] } : item))
}

/**
 * §5.2 — on-device search. Every typed word must match somewhere in name,
 * description, category or tags; name matches rank first; capped at 40;
 * scoped to the owners the current section reads.
 */
export function searchMenu(
  items: BibleMenuItem[],
  categoriesById: Map<string, BibleMenuCategory>,
  query: string,
  owners: MenuOwner[],
): BibleMenuItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const hits: { item: BibleMenuItem; rank: number }[] = []
  for (const item of items) {
    if (!owners.includes(item.owner)) continue
    const name = item.name.toLowerCase()
    const haystack = [name, item.description, categoriesById.get(item.categoryId)?.label ?? '', item.tags.join(' ')].join(' ').toLowerCase()
    if (words.every((w) => haystack.includes(w))) hits.push({ item, rank: words.every((w) => name.includes(w)) ? 0 : 1 })
  }
  return hits
    .sort((a, b) => a.rank - b.rank || a.item.sortOrder - b.item.sortOrder)
    .slice(0, 40)
    .map((hit) => hit.item)
}

/** Prices read as printed, in thousands: "60", "Small 60 · Large 85", "90 / 400" (OI-1, unlabelled). */
export function formatPrices(prices: BiblePrice[]): string {
  const k = (amount: number) => (amount / 1000).toLocaleString('en-US')
  if (prices.every((p) => p.label === null)) return prices.map((p) => k(p.amount)).join(' / ')
  return prices.map((p) => `${p.label ? `${p.label} ` : ''}${k(p.amount)}`).join(' · ')
}
