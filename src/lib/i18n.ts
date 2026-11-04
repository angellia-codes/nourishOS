import { useLanguageStore } from '@/store/languageStore'

/**
 * App-wide EN/ID copy. STYLE_GUIDE.md "Bilingual constraints": user-facing
 * labels are `{id, en}` pairs — `Bilingual` (position.types.ts) and the Bible's
 * strings use the same shape, so `t()` takes any of them.
 */
export type Lang = 'en' | 'id'

export interface Pair {
  en: string
  id: string
}

export const t = (pair: Pair, lang: Lang) => pair[lang]

/** For pairs whose `id` may not be translated yet (training titles before the O4 pass). */
export const tOrEn = (pair: { en: string; id: string | null } | null | undefined, lang: Lang) =>
  (pair && (pair[lang] || pair.en)) ?? ''

export const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))

/** Returns a primitive, so it is safe in dependency arrays. */
export const useLang = () => useLanguageStore((s) => s.lang)
