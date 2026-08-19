import type { BaseDocument } from './firestore.types'

/**
 * opening_closing_shift_report_template.md — the Opening/Closing Shift Report.
 *
 * Stored in the `shiftHandovers` collection, which existed as an unused
 * constant for operations.md §9 ("Shift Handover"). This report carries §9's
 * outstanding tasks / important notes / equipment status alongside the rest of
 * the template, so it takes that collection over rather than adding a second
 * name for the same thing.
 *
 * Document id is deterministic — `${outletId}__${date}__${reportType}` — the
 * same trick the old checklist completion used: no uniqueness query on submit,
 * and the Closing form can fetch that morning's Opening report with one get.
 */
export type ShiftReportType = 'opening' | 'closing'

/** Template §3 splits N/A Food, N/A Cake/Gelato and N/A Beverage into three identical tables. */
export type UnavailableCategory = 'food' | 'cakeGelato' | 'beverage'

/** Every "- [ ] None / - [ ] Yes — Details:" pair in the template. Nine fields share this shape. */
export interface ShiftReportIssue {
  present: boolean
  details: string
}

export interface UnavailableItem {
  category: UnavailableCategory
  product: string
  reason: string
  actionRequired: string
}

export interface LimitedItem {
  product: string
  remainingQty: number
  actionRequired: string
}

/** Template §5 — one block per department. `midShift` is asked for on the closing report only. */
export interface DeptStaffing {
  pic: string
  regularStaff: number
  dailyWorker: number
  midShift: number
}

export interface ShiftReport extends BaseDocument {
  reportType: ShiftReportType
  /** Required here, unlike BaseDocument's optional pair — a report always belongs to one outlet. */
  outletId: string
  /** 'YYYY-MM-DD', server-set from todayIso() (WITA) — never trusted from the client. */
  date: string
  /** Free-text shift label ("Morning", "Mid", "Night"). Not part of the doc id. */
  shift: string
  /** uid of the manager / PIC who filed it. */
  picUid: string

  // §2 Sales & Promotion
  foodPromo: string
  beveragePromo: string
  specialMenu: string

  // §3 Product Availability
  unavailableItems: UnavailableItem[]
  limitedItems: LimitedItem[]

  // §4 Customer Feedback / Experience
  complaints: ShiftReportIssue
  customerFeedback: ShiftReportIssue
  reviewRating: number | null
  reviewCount: number | null
  reviewKeyFeedback: string

  // §5 Staffing & Attendance
  /** Closing report only — '' on an opening report. */
  managerIc: string
  supervisorIc: string
  floor: DeptStaffing
  bar: DeptStaffing
  kitchen: DeptStaffing
  steward: number
  cashier: string
  otherPositions: string
  absent: ShiftReportIssue
  sickLeave: ShiftReportIssue
  permission: ShiftReportIssue

  // §6 Operational & Maintenance Issues
  maintenance: ShiftReportIssue
  equipment: ShiftReportIssue
  /** Closing report only — the template asks for these two under closing. */
  hygiene: ShiftReportIssue
  stock: ShiftReportIssue
  otherNotes: string

  /**
   * §7 Closing Checklist, absorbed from the retired Opening/Closing Checklists
   * feature. Keyed by ChecklistItem.id from src/constants/checklist.ts; the
   * opening report carries the opening list, which the template itself omits.
   */
  checklistStatuses: Record<string, boolean>

  // §7/§8 Handover
  priorities: string[]
  /** Closing report only. */
  followUpRequired: string
  picAcknowledgement: string

  /** Set on a closing report when that day's opening report exists. */
  openingReportId: string | null

  /** Overrides BaseDocument's generic status — single-state, no approval workflow. */
  status: 'submitted'
}
