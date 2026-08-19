import {
  Archive,
  BadgeCheck,
  Ban,
  CircleHelp,
  Clock,
  FileEdit,
  Hourglass,
  ShieldAlert,
  TimerOff,
  type LucideIcon,
} from 'lucide-react'
import type { StatusTone } from '@/components/ui'
import type {
  AcknowledgementStatus,
  CommunicationStatus,
  DisciplinaryRecord,
  ProposedActionCategory,
} from '@/types'
import { DISCIPLINARY_VALIDITY_DAYS, type DisciplinaryType } from '@/constants/hr'

/** employee_communication.md §7. */
export const COMMUNICATION_STATUS_LABELS: Record<CommunicationStatus, string> = {
  draft: 'Draft',
  pendingApproval: 'In Review',
  pendingEmployee: 'Pending Employee',
  active: 'Active',
  expired: 'Expired',
  closed: 'Closed',
  open: 'Open (legacy)',
}

/** STYLE_GUIDE.md § Shared components — the workflow ramp. */
export const COMMUNICATION_STATUS_TONE: Record<CommunicationStatus, StatusTone> = {
  draft: 'draft',
  pendingApproval: 'warning',
  pendingEmployee: 'warning',
  active: 'error',
  expired: 'neutral',
  closed: 'closed',
  open: 'warning',
}

export const COMMUNICATION_STATUS_ICON: Record<CommunicationStatus, LucideIcon> = {
  draft: FileEdit,
  pendingApproval: Clock,
  pendingEmployee: Hourglass,
  active: ShieldAlert,
  expired: TimerOff,
  closed: Archive,
  open: ShieldAlert,
}

export const ACKNOWLEDGEMENT_STATUS_LABELS: Record<AcknowledgementStatus, string> = {
  pending: 'Pending',
  acknowledged: 'Acknowledged receipt',
  refused: 'Refused to sign',
  unableToSign: 'Unable to sign',
}

export const ACKNOWLEDGEMENT_STATUS_TONE: Record<AcknowledgementStatus, StatusTone> = {
  pending: 'warning',
  acknowledged: 'success',
  refused: 'error',
  unableToSign: 'neutral',
}

export const ACKNOWLEDGEMENT_STATUS_ICON: Record<AcknowledgementStatus, LucideIcon> = {
  pending: Hourglass,
  acknowledged: BadgeCheck,
  refused: Ban,
  unableToSign: CircleHelp,
}

/** §11. */
export const PROPOSED_ACTION_CATEGORY_LABELS: Record<ProposedActionCategory, string> = {
  coaching: 'Coaching',
  retraining: 'Retraining',
  counseling: 'Counseling',
  followUpMeeting: 'Follow-up meeting',
  performanceImprovement: 'Performance improvement',
  scheduleAdjustment: 'Schedule adjustment',
  writtenWarning: 'Written warning',
  other: 'Other corrective action',
}

/**
 * §33 — the source form is bilingual, so its section headings are too. There is
 * no i18n framework in this app and this is the only surface that needs one, so
 * the pairs are literal rather than keys into a catalogue: the Indonesian is not
 * a translation of the UI, it is what the official form says.
 */
export const BILINGUAL: Record<string, { en: string; id: string }> = {
  form: { en: 'Employee Communication', id: 'Formulir Komunikasi Karyawan' },
  employeeInfo: { en: 'Employee Information', id: 'Informasi Karyawan' },
  communicationDetails: { en: 'Communication Details', id: 'Rincian Komunikasi' },
  employeeStatement: { en: 'Employee Statement', id: 'Pernyataan Karyawan' },
  proposedAction: { en: 'Proposed Solution / Action', id: 'Usulan Solusi / Tindakan' },
  disciplinaryAction: { en: 'Disciplinary Action', id: 'Tindakan Disiplin' },
  furtherAction: { en: 'Further Action', id: 'Tindakan yang Dilakukan' },
  repeatIncident: { en: 'Consequences of Repeated Incidents', id: 'Konsekuensi Pelanggaran Berulang' },
  declaration: { en: 'Declaration', id: 'Pernyataan' },
  signatures: { en: 'Signatures', id: 'Tanda Tangan' },
}

/**
 * §16 — the wording that keeps receipt distinct from agreement. Printed above
 * the signature block and shown to the employee before they acknowledge.
 */
export const DECLARATION = {
  en: 'I acknowledge that I have received and had this communication explained to me. Acknowledging receipt does not mean I agree with its contents.',
  id: 'Saya menyatakan telah menerima dan mendapat penjelasan mengenai komunikasi ini. Penerimaan ini tidak berarti saya menyetujui isinya.',
}

/** §35 Rule 2 — only a draft is editable; everything downstream is locked. */
export function isEditable(status: CommunicationStatus): boolean {
  return status === 'draft'
}

/** §13 — the type's default validity window, in days. Null means no expiry. */
export function validityDaysFor(type: DisciplinaryType): number | null {
  return DISCIPLINARY_VALIDITY_DAYS[type]
}

/**
 * Whole days from today until `validUntil`, or null when there is no expiry.
 * Negative once the date has passed — the daily expiry job may not have run yet.
 * Plain ISO string comparison, no date library, same as the dashboard widgets.
 */
export function daysRemaining(validUntil: string | null | undefined): number | null {
  if (!validUntil) return null
  const today = new Date().toISOString().slice(0, 10)
  const diffMs = Date.parse(`${validUntil}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)
  return Math.round(diffMs / 86_400_000)
}

/** The one-line "SP1 · valid until 19 Feb 2027 · 43 days left" summary. */
export function describeValidity(record: DisciplinaryRecord): string | null {
  if (!record.validUntil) return null
  const remaining = daysRemaining(record.validUntil)
  if (remaining === null) return null
  if (remaining < 0) return `Lapsed ${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? '' : 's'} ago`
  if (remaining === 0) return 'Expires today'
  return `${remaining} day${remaining === 1 ? '' : 's'} left`
}
