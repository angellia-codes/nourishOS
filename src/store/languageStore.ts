import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '@/lib/i18n'

interface LanguageState {
  lang: Lang
  setLang: (lang: Lang) => void
}

/**
 * EN/ID UI language (HR_OPERATIONS.md §16.4 "Full bilingual UI"). Persisted
 * per browser only, like the theme — there is no profile field for it.
 */
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'nourishos-lang' },
  ),
)
