/**
 * Outlet and department ids render as "Nourish Uluwatu" / "F&B Service"
 * without shipping a copy of src/constants/organization.ts to the public app —
 * the ids are already human-readable snake_case, so title-casing them is
 * enough, and it cannot fall out of sync with a list it does not keep.
 */
export function titleCase(id: string): string {
  return id
    .split('_')
    .map((word) => (word === 'fb' ? 'F&B' : word === 'boh' ? 'BOH' : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
}

/** The F010 "how did you hear about us" superset — employment-application-form.md §2. */
export const SOURCES: { value: string; label: string }[] = [
  { value: 'jobPortal', label: 'Job portal' },
  { value: 'referral', label: 'Referral from someone I know' },
  { value: 'socialMedia', label: 'Social media' },
  { value: 'broadcast', label: 'Broadcast message' },
  { value: 'appliedDirectly', label: 'Applied directly / walk-in' },
  { value: 'otherAdvertisement', label: 'Other advertisement' },
  { value: 'employmentAgency', label: 'Employment agency' },
  { value: 'other', label: 'Other' },
]

/**
 * The truthfulness declaration, printed on F010 and rendered verbatim in both
 * languages above the checkbox — employment-application-form.md §5 is explicit
 * that a bare checkbox loses the legal weight of the printed statement.
 */
export const DECLARATION_ID =
  'Saya menyatakan bahwa data yang saya tulis di atas adalah benar. Apabila di kemudian hari ternyata data tersebut tidak benar, saya bersedia menerima pemutusan hubungan kerja tanpa pesangon.'

export const DECLARATION_EN =
  'I declare that the information I have given above is correct. If any of it is later found to be untrue, I accept that my employment may be terminated without severance pay.'
