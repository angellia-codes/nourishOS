import { ShieldCheck, Wrench, Flame, CalendarX, Archive, type LucideIcon } from 'lucide-react'
import type { StatusTone } from '@/components/ui'
import type {
  AparChecklistKey,
  AparItemResult,
  ExtinguisherStatus,
  ExtinguisherType,
  FireExtinguisher,
} from '@/types'

/**
 * fire-extinguisher.md §3 — the canonical six items, mirrored from
 * functions/src/security/fireExtinguishers/helpers.ts. Both copies must move
 * together: the callable rejects any item set that isn't exactly these keys.
 *
 * Bilingual labels stop here. §9.5 asks for full bilingual coverage, but the
 * rest of this app is English-only, so the Indonesian half is carried where it
 * changes an outcome — the checklist the guard reads in a corridor.
 */
export const APAR_CHECKLIST_ITEMS: { key: AparChecklistKey; en: string; id: string }[] = [
  { key: 'accessibility', en: 'Location & Accessibility', id: 'Lokasi & Aksesibilitas' },
  { key: 'bodyHandle', en: 'Body & Handle', id: 'Bodi & Pegangan' },
  { key: 'pressureGauge', en: 'Pressure Gauge', id: 'Indikator Tekanan' },
  { key: 'sealPin', en: 'Seal & Pin', id: 'Segel & Pin Pengaman' },
  { key: 'nozzle', en: 'Nozzle', id: 'Nozzle / Selang' },
  { key: 'labelTag', en: 'Label & Inspection Tag', id: 'Label & Kartu Pemeriksaan' },
]

/** §4.6 — a gauge or seal/pin failure means the cylinder won't discharge; it can never be resolved on the spot. */
export const FORCED_SERVICE_ITEMS: AparChecklistKey[] = ['pressureGauge', 'sealPin']

/** Attachment II's legend, kept verbatim so the paper form transfers unchanged. */
export const ITEM_RESULT_SYMBOL: Record<AparItemResult, string> = {
  pass: 'V',
  fail: 'X',
  notApplicable: 'N/A',
}

export const ITEM_RESULT_LABEL: Record<AparItemResult, string> = {
  pass: 'Pass',
  fail: 'Fail',
  notApplicable: 'N/A',
}

export const EXTINGUISHER_TYPE_LABELS: Record<ExtinguisherType, string> = {
  powder: 'Dry Powder',
  co2: 'CO₂',
  foam: 'Foam',
  wetChemical: 'Wet Chemical',
}

export const EXTINGUISHER_STATUS_LABELS: Record<ExtinguisherStatus, string> = {
  active: 'Active',
  needsService: 'Needs Service',
  discharged: 'Discharged',
  expired: 'Expired',
  retired: 'Retired',
}

export const EXTINGUISHER_STATUS_TONE: Record<ExtinguisherStatus, StatusTone> = {
  active: 'success',
  needsService: 'warning',
  discharged: 'error',
  expired: 'error',
  retired: 'closed',
}

export const EXTINGUISHER_STATUS_ICON: Record<ExtinguisherStatus, LucideIcon> = {
  active: ShieldCheck,
  needsService: Wrench,
  discharged: Flame,
  expired: CalendarX,
  retired: Archive,
}

export const OVERALL_RESULT_LABELS: Record<'pass' | 'failResolved' | 'failNeedsService', string> = {
  pass: 'Pass',
  failResolved: 'Fail — resolved on the spot',
  failNeedsService: 'Fail — service required',
}

export const OVERALL_RESULT_TONE: Record<'pass' | 'failResolved' | 'failNeedsService', StatusTone> = {
  pass: 'success',
  failResolved: 'warning',
  failNeedsService: 'error',
}

/** "6 kg CO₂" — the label a guard matches against the cylinder in front of them. */
export function formatUnitSpec(unit: FireExtinguisher): string {
  return `${unit.weightKg} kg ${EXTINGUISHER_TYPE_LABELS[unit.extinguisherType] ?? unit.extinguisherType}`
}

/** Whole days from today to a 'YYYY-MM-DD' key; negative once it is past. */
export function daysUntil(dateKey: string | null): number | null {
  if (!dateKey) return null
  const target = Date.parse(`${dateKey}T00:00:00Z`)
  if (Number.isNaN(target)) return null
  const today = Date.parse(`${new Date().toLocaleDateString('en-CA')}T00:00:00Z`)
  return Math.round((target - today) / 86_400_000)
}

/** §4.7's alert ladder, reused for the register list's expiry column. */
export function expiryTone(dateKey: string | null): StatusTone {
  const days = daysUntil(dateKey)
  if (days === null) return 'neutral'
  if (days <= 0) return 'error'
  if (days <= 30) return 'error'
  if (days <= 90) return 'warning'
  return 'neutral'
}

/** '2026-08' → 'August 2026'. */
export function formatPeriodMonth(periodMonth: string): string {
  const parsed = Date.parse(`${periodMonth}-01T00:00:00Z`)
  if (Number.isNaN(parsed)) return periodMonth
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parsed)
}

/** The current period key in WITA-ish local terms — the round screen and list banner both key off it. */
export function currentPeriodMonth(): string {
  return new Date().toLocaleDateString('en-CA').slice(0, 7)
}

export function roundReferenceId(outletId: string, periodMonth: string): string {
  return `${outletId}__${periodMonth}`
}
