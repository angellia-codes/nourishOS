import { createContext, useContext } from 'react'
import type { BibleAccess, BibleEdition, BibleMenuCategory, BibleMenuItem } from '@/types'
import type { BookPage, SectionId, Spread } from './bibleBook'
import type { Lang } from './strings'

export interface SectionSelection {
  categoryId: string | null
  itemId: string | null
  group: 'food' | 'beverage'
}

export interface ReaderContextValue {
  lang: Lang
  edition: BibleEdition
  /** The outlet-merged view (§5.3) — what this reader is allowed to see sold. */
  items: BibleMenuItem[]
  categories: BibleMenuCategory[]
  categoriesById: Map<string, BibleMenuCategory>
  access: BibleAccess
  pages: BookPage[]
  spreads: Spread[]
  goTo: (key: string) => void
  selection: Record<SectionId, SectionSelection>
  select: (section: SectionId, patch: Partial<SectionSelection>) => void
  openSearch: () => void
  canPublishForms: boolean
}

export const ReaderContext = createContext<ReaderContextValue | null>(null)

export function useReader(): ReaderContextValue {
  const value = useContext(ReaderContext)
  if (!value) throw new Error('useReader must be used inside the Bible reader')
  return value
}
