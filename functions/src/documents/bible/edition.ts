/**
 * Nourish's Bible — the compiled, immutable edition staff read
 * (nourish-bible.md §6.1/§7). Pure: no `db`, no `lib/admin` import, so the
 * hand-run import script and `npm test` can load it without the Admin SDK.
 * Phase 2's publishEditionInternal wraps buildEdition with the pointer swap.
 */

export type MenuGroup = 'food' | 'beverage'
export type MenuOwner = 'kitchen' | 'bar' | 'bakery'
export type DietaryTag = 'V' | 'VG' | 'GF' | 'VO'

export const MENU_OWNERS: readonly MenuOwner[] = ['kitchen', 'bar', 'bakery']
export const DIETARY_TAGS: readonly DietaryTag[] = ['V', 'VG', 'GF', 'VO']

/** §5.1 — item codes are fixed per owner and never reused. */
export const ITEM_CODE_PREFIX: Record<MenuOwner, string> = { kitchen: 'KIT', bar: 'BAR', bakery: 'TBK' }

/** The three restaurants that share the master menu (D4, OI-6). */
export const BIBLE_OUTLETS = ['nourish_uluwatu', 'nourish_ungasan', 'nourish_berawa'] as const

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

export interface BibleMenuCategory {
  id: string
  label: string
  group: MenuGroup
  owner: MenuOwner
  servingHours: string | null
  note: string | null
  sortOrder: number
}

export interface BibleMenuItem {
  id: string // = itemCode
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
  lockedByRequestId?: string | null
}

interface Bilingual {
  id: string
  en: string
}

export interface BibleContent {
  id: string
  kind: 'grooming' | 'sequenceOfService'
  scope: 'frontOfHouse' | 'backOfHouse' | 'floor' | 'cashier'
  heading: Bilingual
  blocks: Array<{ label: Bilingual; body: Bilingual }>
  photoFileId: string | null
  lockedByRequestId?: string | null
}

export interface BibleEditionBody {
  editionNumber: number
  publishedBy: string
  changeRequestId: string | null
  categories: BibleMenuCategory[]
  items: Omit<BibleMenuItem, 'lockedByRequestId'>[]
  content: Omit<BibleContent, 'lockedByRequestId'>[]
}

/** §6.1 — fail well under Firestore's 1 MiB document limit. */
export const EDITION_MAX_BYTES = 900 * 1024

const bySortOrder = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder

/**
 * Compiles source records into one edition body. Throws (naming the size)
 * above EDITION_MAX_BYTES — the §15 fix is to split editions by chapter.
 */
export function buildEdition(input: {
  categories: BibleMenuCategory[]
  items: BibleMenuItem[]
  content: BibleContent[]
  editionNumber: number
  publishedBy: string
  changeRequestId?: string | null
}): BibleEditionBody {
  const body: BibleEditionBody = {
    editionNumber: input.editionNumber,
    publishedBy: input.publishedBy,
    changeRequestId: input.changeRequestId ?? null,
    categories: [...input.categories].sort(bySortOrder),
    items: [...input.items].sort(bySortOrder).map(({ lockedByRequestId: _lock, ...item }) => item),
    content: input.content.map(({ lockedByRequestId: _lock, ...block }) => block),
  }
  const bytes = Buffer.byteLength(JSON.stringify(body), 'utf8')
  if (bytes > EDITION_MAX_BYTES) {
    throw new Error(
      `Edition is ${Math.round(bytes / 1024)} KB, over the ${EDITION_MAX_BYTES / 1024} KB limit. Split editions by chapter (nourish-bible.md §6.1).`,
    )
  }
  return body
}

// ---- Menu seed (§3 Phase 1 initial load) ----

/** Prices are written in thousands, as printed: 60 → Rp 60,000. */
export type SeedPrice = number | number[] | Record<string, number>

export interface SeedItem {
  code: string
  name: string
  description?: string
  price: SeedPrice
  tags?: DietaryTag[]
}

export interface SeedCategory {
  id: string
  label: string
  group: MenuGroup
  owner: MenuOwner
  servingHours: string | null
  note: string | null
  /** Labels for array prices, e.g. pizzas ['Small', 'Large'] (D7). Absent = unlabelled. */
  priceLabels?: string[]
  /** Bought-in drinks (beer, wine, soft drinks) have no recipe to write. */
  needsRecipe?: boolean
  items: SeedItem[]
}

function expandPrice(price: SeedPrice, labels: string[] | undefined, code: string): BiblePrice[] {
  const rupiah = (n: number) => {
    if (!Number.isFinite(n) || n <= 0) throw new Error(`${code}: price ${n} is not a positive number`)
    return Math.round(n * 1000)
  }
  if (typeof price === 'number') return [{ label: null, amount: rupiah(price) }]
  if (Array.isArray(price)) {
    if (labels && labels.length !== price.length) throw new Error(`${code}: ${price.length} prices for ${labels.length} labels`)
    return price.map((n, i) => ({ label: labels?.[i] ?? null, amount: rupiah(n) }))
  }
  return Object.entries(price).map(([label, n]) => ({ label, amount: rupiah(n) }))
}

/**
 * Expands the compact seed into source records and validates it: owner
 * prefixes, unique codes and category ids, known tags. Throws on the first
 * problem so a bad seed never reaches Firestore.
 */
export function expandMenuSeed(seed: SeedCategory[]): { categories: BibleMenuCategory[]; items: BibleMenuItem[] } {
  const categories: BibleMenuCategory[] = []
  const items: BibleMenuItem[] = []
  const codes = new Set<string>()
  const categoryIds = new Set<string>()
  let itemOrder = 0

  seed.forEach((category, categoryIndex) => {
    if (categoryIds.has(category.id)) throw new Error(`Duplicate category id ${category.id}`)
    categoryIds.add(category.id)
    if (!MENU_OWNERS.includes(category.owner)) throw new Error(`${category.id}: unknown owner ${category.owner}`)
    categories.push({
      id: category.id,
      label: category.label,
      group: category.group,
      owner: category.owner,
      servingHours: category.servingHours,
      note: category.note,
      sortOrder: categoryIndex + 1,
    })

    const prefix = ITEM_CODE_PREFIX[category.owner]
    for (const item of category.items) {
      if (!new RegExp(`^${prefix}-\\d{3}$`).test(item.code)) {
        throw new Error(`${item.code} (${item.name}): code must be ${prefix}-NNN for owner ${category.owner}`)
      }
      if (codes.has(item.code)) throw new Error(`Duplicate item code ${item.code}`)
      codes.add(item.code)
      for (const tag of item.tags ?? []) {
        if (!DIETARY_TAGS.includes(tag)) throw new Error(`${item.code}: unknown tag ${tag}`)
      }
      itemOrder += 1
      items.push({
        id: item.code,
        itemCode: item.code,
        categoryId: category.id,
        owner: category.owner,
        name: item.name,
        description: item.description ?? '',
        tags: item.tags ?? [],
        prices: expandPrice(item.price, category.priceLabels, item.code),
        photoFileId: null,
        serviceNotes: null,
        needsNotes: true,
        needsRecipe: category.needsRecipe ?? true,
        sortOrder: itemOrder,
      })
    }
  })

  return { categories, items }
}
