/**
 * Mirrors functions/src/lib/checklist.ts — see that file for why these are a
 * code table, not an admin-editable doc.
 *
 * These used to back the standalone Opening/Closing Checklists pages. Those
 * were absorbed into the Shift Report (opening_closing_shift_report_template.md
 * §7), so the tables survive as one section of that form; the closing list is
 * the template's own ten items, and the opening list is the original six the
 * template never replaced.
 */
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

/** opening_closing_shift_report_template.md §7 — Closing Checklist, verbatim. */
export const CLOSING_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'outlet_cleaned', label: 'Outlet cleaned and organized' },
  { id: 'kitchen_secured', label: 'Kitchen cleaned and secured' },
  { id: 'bar_secured', label: 'Bar cleaned and secured' },
  { id: 'equipment_off', label: 'Equipment switched off / secured' },
  { id: 'chiller_checked', label: 'Chiller / freezer checked' },
  { id: 'stock_updated', label: 'Stock / N/A items updated' },
  { id: 'cashier_closed', label: 'Cashier closing completed' },
  { id: 'maintenance_reported', label: 'Maintenance issues reported' },
  { id: 'handover_done', label: 'Important information handed over to next shift' },
  { id: 'outlet_secured', label: 'Outlet secured' },
]

export function checklistItemsFor(type: 'opening' | 'closing'): ChecklistItem[] {
  return type === 'opening' ? OPENING_CHECKLIST_ITEMS : CLOSING_CHECKLIST_ITEMS
}
