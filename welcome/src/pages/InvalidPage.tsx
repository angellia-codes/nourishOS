import { Card } from '../ui'
import { STRINGS, t, type Lang } from '../strings'

/**
 * welcome-portal.md §11 — one screen for every token failure.
 *
 * Bad, expired, revoked, unknown, or simply absent: the hire sees the same
 * thing, because the server already refuses to distinguish them (§10.2). This
 * page must never try to be more helpful than the response it is rendering —
 * "expired" vs "not found" is exactly the distinction token probing is after.
 *
 * The HR contact is deliberately not printed here. Open item M8 records that
 * the Company Profile and the Org Chart disagree about who a hire should
 * contact, and inventing an answer in the one screen a stuck hire reaches is
 * the worst place to guess.
 */
export function InvalidPage({ lang, message }: { lang: Lang; message?: string }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4">
      <Card className="w-full text-center">
        <p className="mb-4 text-4xl" aria-hidden="true">
          ✉
        </p>
        <h1 className="text-xl font-bold">{t(STRINGS.invalidTitle, lang)}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--w-cream-soft)]">
          {message || t(STRINGS.invalidBody, lang)}
        </p>
      </Card>
    </div>
  )
}
