/**
 * The F01 "Employee In/Out Data Check List" OUT sheet's 3 genuinely-a-document
 * rows — employee-onboarding-exit-checklist.md §5. The other 6 OUT items
 * become real Task Engine tasks (offboarding.ts), same split the IN list's
 * onboardingItems.ts already established.
 */
export interface OffboardingItemTemplate {
  itemNumber: number
  label: string
  tier: 'mandatory' | 'followUp' | 'optional' | 'process'
  treatment: 'collect' | 'verify' | 'generate' | 'notDigitized'
}

export const OFFBOARDING_DOCUMENT_ITEMS: readonly OffboardingItemTemplate[] = [
  { itemNumber: 1, label: 'Resignation Letter', tier: 'mandatory', treatment: 'collect' },
  // §5 item 6: "not worth a dedicated task, can be a checkbox" — optional, never blocks.
  { itemNumber: 6, label: 'Employee Out Photo Taking', tier: 'optional', treatment: 'collect' },
  { itemNumber: 9, label: 'Surat Pernyataan Bermaterai (stamped statutory declaration)', tier: 'mandatory', treatment: 'collect' },
]
