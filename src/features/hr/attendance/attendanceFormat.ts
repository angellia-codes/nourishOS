import { CheckCircle2, CircleDashed, Clock, Lock, Send, XCircle, type LucideIcon } from 'lucide-react'
import type { StatusTone } from '@/components/ui'
import type { AttendanceCode, AttendanceCodeClass, AttendancePeriodStatus, AttendanceRecord } from '@/types'

/** attendance.md §2 — code labels, EN/ID. Statutory names keep their official Indonesian forms (§2.1). */
export const CODE_LABELS: Record<AttendanceCode, { en: string; id: string }> = {
  WD: { en: 'Working Days', id: 'Hari Kerja' },
  DO: { en: 'Day Off', id: 'Libur' },
  PH: { en: 'Public Holiday', id: 'Libur Nasional' },
  DP: { en: 'Day Payment', id: 'Day Payment' },
  AL: { en: 'Annual Leave', id: 'Cuti Tahunan' },
  MC: { en: 'Medical Certificate', id: 'Cuti Sakit' },
  EO: { en: 'Extra Off', id: 'Extra Off' },
  SL: { en: 'Special Leave', id: 'Cuti Khusus' },
  UL: { en: 'Unpaid Leave', id: 'Cuti Tanpa Gaji' },
}

export const CODE_CLASS: Record<AttendanceCode, AttendanceCodeClass> = {
  WD: 'worked',
  DO: 'rest',
  PH: 'rest',
  DP: 'leaveEntitled',
  AL: 'leaveEntitled',
  MC: 'leaveEntitled',
  EO: 'leaveEntitled',
  SL: 'leaveEntitled',
  UL: 'leaveUnpaid',
}

export const ENTITLED_LEAVE_CODES: readonly AttendanceCode[] = ['PH', 'DP', 'AL', 'MC', 'EO', 'SL']

/** 'YYYY-MM' → 'July 2026'. */
export function formatPeriod(period: string): string {
  const [year, month] = period.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  if (Number.isNaN(date.getTime())) return period
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** Each module owns its own status → {tone, icon, label} mapping; StatusPill stays generic (never colour alone). */
export const PERIOD_STATUS_DISPLAY: Record<AttendancePeriodStatus, { tone: StatusTone; icon: LucideIcon; label: string }> = {
  draft: { tone: 'draft', icon: CircleDashed, label: 'Draft' },
  submitted: { tone: 'info', icon: Send, label: 'Submitted' },
  pendingApproval: { tone: 'warning', icon: Clock, label: 'Pending approval' },
  approved: { tone: 'success', icon: CheckCircle2, label: 'Approved' },
  rejected: { tone: 'error', icon: XCircle, label: 'Rejected' },
  closed: { tone: 'closed', icon: Lock, label: 'Closed' },
}

/** §7.2 — Σ WD ÷ (Σ WD + Σ UL). */
export function attendanceRate(records: Pick<AttendanceRecord, 'days'>[]): number {
  const wd = records.reduce((sum, r) => sum + r.days.WD, 0)
  const ul = records.reduce((sum, r) => sum + r.days.UL, 0)
  return wd + ul === 0 ? 0 : wd / (wd + ul)
}

/** §7.2 — 1 − (Σ lateCount ÷ Σ WD). */
export function punctualityRate(records: Pick<AttendanceRecord, 'days' | 'lateCount'>[]): number {
  const wd = records.reduce((sum, r) => sum + r.days.WD, 0)
  const late = records.reduce((sum, r) => sum + r.lateCount, 0)
  return wd === 0 ? 1 : 1 - late / wd
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function totalEntitledLeave(record: Pick<AttendanceRecord, 'days'>): number {
  return ENTITLED_LEAVE_CODES.reduce((sum, code) => sum + record.days[code], 0)
}
