/** Mirrors functions/src/lib/checklist.ts — see that file for why these are a code table, not an admin-editable doc. */
export interface ChecklistItem {
  id: string
  label: string
}

export const OPENING_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'lights_on', label: 'Turn on all lights and signage' },
  { id: 'equipment_check', label: 'Check all equipment is functioning' },
  { id: 'stock_check', label: 'Verify opening stock levels' },
  { id: 'cleanliness_check', label: 'Confirm cleanliness of the outlet' },
  { id: 'cash_float', label: 'Count and confirm the cash float' },
  { id: 'staff_briefing', label: "Brief staff on the day's priorities" },
]

export const CLOSING_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'equipment_off', label: 'Turn off all non-essential equipment' },
  { id: 'stock_secured', label: 'Secure stock and storage areas' },
  { id: 'cleaning_done', label: 'Complete closing cleaning tasks' },
  { id: 'cash_reconciled', label: 'Reconcile and secure the cash float' },
  { id: 'lights_off', label: 'Turn off lights and signage' },
  { id: 'doors_locked', label: 'Lock all doors and windows' },
]
