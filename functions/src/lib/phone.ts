/**
 * Indonesian phone canonicalisation, shared by every module that has to decide
 * whether two typed numbers are the same person.
 *
 * `0811…`, `+62811…`, `62811…` and `0062811…` are one line. Lived in
 * recruitment/portal/guard.ts until the Welcome Portal needed the same rule
 * (welcome-portal.md §4.2 "normalised to 62…"); that file now re-exports this
 * one so there is a single definition rather than a second copy to drift.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  return digits
}
