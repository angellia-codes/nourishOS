import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type {
  DeptStaffing,
  LimitedItem,
  ShiftReport,
  ShiftReportIssue,
  ShiftReportType,
  UnavailableItem,
} from '@/types'
import type { Unsubscribe } from '@/services/firestore'

export interface SubmitShiftReportInput {
  reportType: ShiftReportType
  shift: string
  /** Defaults to the caller's own outlet if omitted. */
  outletId?: string

  foodPromo?: string
  beveragePromo?: string
  specialMenu?: string

  unavailableItems?: UnavailableItem[]
  limitedItems?: LimitedItem[]

  complaints?: ShiftReportIssue
  customerFeedback?: ShiftReportIssue
  reviewRating?: number | null
  reviewCount?: number | null
  reviewKeyFeedback?: string

  managerIc?: string
  supervisorIc?: string
  floor?: DeptStaffing
  bar?: DeptStaffing
  kitchen?: DeptStaffing
  steward?: number
  cashier?: string
  otherPositions?: string
  absent?: ShiftReportIssue
  sickLeave?: ShiftReportIssue
  permission?: ShiftReportIssue

  maintenance?: ShiftReportIssue
  equipment?: ShiftReportIssue
  hygiene?: ShiftReportIssue
  stock?: ShiftReportIssue
  otherNotes?: string

  checklistStatuses?: Record<string, boolean>

  priorities?: string[]
  followUpRequired?: string
  picAcknowledgement?: string
}

export function submitShiftReport(input: SubmitShiftReportInput): Promise<{ reportId: string }> {
  return callFunction('submitShiftReport', input)
}

export function subscribeToShiftReports(onChange: (reports: ShiftReport[]) => void): Unsubscribe {
  return subscribeToCollection<ShiftReport>(
    COLLECTIONS.SHIFT_HANDOVERS,
    [where('isArchived', '==', false), orderBy('createdAt', 'desc')],
    onChange,
  )
}

/**
 * One report by its deterministic id — no query, no index. Used by the detail
 * page and by the closing form to pull that morning's opening report for the
 * carry-forward banner.
 */
export function getShiftReport(outletId: string, date: string, type: ShiftReportType): Promise<ShiftReport | null> {
  return getDocument<ShiftReport>(COLLECTIONS.SHIFT_HANDOVERS, `${outletId}__${date}__${type}`)
}

export function getShiftReportById(reportId: string): Promise<ShiftReport | null> {
  return getDocument<ShiftReport>(COLLECTIONS.SHIFT_HANDOVERS, reportId)
}
