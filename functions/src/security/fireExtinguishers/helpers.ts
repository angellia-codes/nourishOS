import { db, COLLECTIONS, AppError, todayIso } from '../../lib'
import { OUTLET_DEPARTMENTS } from '../../lib/organization'

/**
 * fire-extinguisher.md §3 — the canonical monthly checklist. `HR-P&P-03`
 * disagrees with itself (Procedure §Pemeriksaan Bulanan drops the nozzle,
 * Attachment II drops accessibility), so the shipped list is the union of
 * both: six items, in the order the guard walks them. Labels are bilingual
 * because the guard reads the Indonesian one — the rest of the module's
 * copy is English like every other module.
 */
export const APAR_CHECKLIST_ITEMS = [
  { key: 'accessibility', en: 'Location & Accessibility', id: 'Lokasi & Aksesibilitas' },
  { key: 'bodyHandle', en: 'Body & Handle', id: 'Bodi & Pegangan' },
  { key: 'pressureGauge', en: 'Pressure Gauge', id: 'Indikator Tekanan' },
  { key: 'sealPin', en: 'Seal & Pin', id: 'Segel & Pin Pengaman' },
  { key: 'nozzle', en: 'Nozzle', id: 'Nozzle / Selang' },
  { key: 'labelTag', en: 'Label & Inspection Tag', id: 'Label & Kartu Pemeriksaan' },
] as const

export type AparChecklistKey = (typeof APAR_CHECKLIST_ITEMS)[number]['key']

const CHECKLIST_KEYS = APAR_CHECKLIST_ITEMS.map((item) => item.key) as AparChecklistKey[]

/**
 * §4.6 — a failed gauge or seal/pin means the cylinder will not discharge. No
 * amount of on-site tidying fixes that, so `resolvedOnSpot` is removed rather
 * than left to the guard's judgement.
 */
export const FORCED_SERVICE_ITEMS: AparChecklistKey[] = ['pressureGauge', 'sealPin']

export const EXTINGUISHER_TYPES = ['powder', 'co2', 'foam', 'wetChemical'] as const
export type ExtinguisherType = (typeof EXTINGUISHER_TYPES)[number]

const ITEM_RESULTS = ['pass', 'fail', 'notApplicable'] as const
type ItemResult = (typeof ITEM_RESULTS)[number]

const RESOLUTIONS = ['resolvedOnSpot', 'needsService'] as const
type Resolution = (typeof RESOLUTIONS)[number]

export interface InspectionItem {
  key: AparChecklistKey
  result: ItemResult
  note: string | null
  photoFileId: string | null
  resolution: Resolution | null
}

// A `type`, not an `interface`: only type aliases get the implicit index
// signature recordAuditEvent's Record<string, unknown> needs — same reason
// CheckpointFields next door is one.
export type ExtinguisherFields = {
  departmentId: string
  locationLabel: string
  extinguisherType: ExtinguisherType
  weightKg: number
  serialNumber: string | null
  manufactureDate: string | null
  installedAt: string
  expiryDate: string
  lastRefillDate: string | null
  nextHydrostaticTestDate: string | null
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function optionalDate(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    throw new AppError('invalid-argument', `${field} must be a YYYY-MM-DD date.`)
  }
  return value
}

/**
 * §4.2 field validation, shared by registerFireExtinguisher and
 * updateFireExtinguisher so the two can never drift — the same
 * validateCheckpointFields precedent next door.
 *
 * `outletId` is validated separately by the caller: it is set once at
 * registration and never editable afterwards (the assetCode encodes it).
 * `status`, `lastInspectedAt` and `nextInspectionDue` are absent on purpose —
 * they are server-owned state (§4.8), not admin-editable fields.
 */
export function validateExtinguisherFields(input: Record<string, unknown>, outletId: string): ExtinguisherFields {
  const locationLabel = typeof input.locationLabel === 'string' ? input.locationLabel.trim() : ''
  const { departmentId, extinguisherType, weightKg } = input

  if (!locationLabel) {
    throw new AppError('invalid-argument', 'locationLabel is required — a guard has to be able to find the cylinder.')
  }
  if (typeof departmentId !== 'string' || !OUTLET_DEPARTMENTS[outletId]?.includes(departmentId)) {
    throw new AppError('invalid-argument', 'That department does not belong to that outlet.')
  }
  if (typeof extinguisherType !== 'string' || !EXTINGUISHER_TYPES.includes(extinguisherType as ExtinguisherType)) {
    throw new AppError('invalid-argument', `extinguisherType must be one of: ${EXTINGUISHER_TYPES.join(', ')}.`)
  }
  if (typeof weightKg !== 'number' || !Number.isFinite(weightKg) || weightKg <= 0) {
    throw new AppError('invalid-argument', 'weightKg must be a positive number.')
  }

  const installedAt = optionalDate(input.installedAt, 'installedAt')
  const expiryDate = optionalDate(input.expiryDate, 'expiryDate')
  if (!installedAt || !expiryDate) {
    throw new AppError('invalid-argument', 'installedAt and expiryDate are required.')
  }

  return {
    departmentId,
    locationLabel,
    extinguisherType: extinguisherType as ExtinguisherType,
    weightKg,
    serialNumber: typeof input.serialNumber === 'string' && input.serialNumber.trim() ? input.serialNumber.trim() : null,
    manufactureDate: optionalDate(input.manufactureDate, 'manufactureDate'),
    installedAt,
    expiryDate,
    lastRefillDate: optionalDate(input.lastRefillDate, 'lastRefillDate'),
    nextHydrostaticTestDate: optionalDate(input.nextHydrostaticTestDate, 'nextHydrostaticTestDate'),
  }
}

/**
 * §2.1/§4.2 — `APAR-<OUTLET>-<NNN>`, sequential per outlet, immutable after
 * creation. Same transaction-counter shape as allocateIncidentNumber, keyed by
 * outlet instead of year (a cylinder's code must not reset in January).
 *
 * The outlet token drops the `nourish_`/`the_` prefixes and uppercases what is
 * left, so `nourish_uluwatu` reads `APAR-ULUWATU-014` on the label.
 */
export async function allocateAssetCode(outletId: string): Promise<string> {
  const token = outletId.replace(/^(nourish_|the_)/, '').replace(/_/g, '-').toUpperCase()
  const counterRef = db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc('aparAssetCodeSequences')

  const next = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const current = (snap.data()?.[outletId] as number | undefined) ?? 0
    const value = current + 1
    tx.set(counterRef, { [outletId]: value }, { merge: true })
    return value
  })

  return `APAR-${token}-${String(next).padStart(3, '0')}`
}

/** '2026-08' in WITA — the §4.3 uniqueness key and the round's period. */
export function currentPeriodMonth(): string {
  return todayIso().slice(0, 7)
}

/** Last day of `periodMonth` — the round task's due date. Day 0 of next month. */
export function periodMonthEnd(periodMonth: string): string {
  const [year, month] = periodMonth.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}

/**
 * A unit inspected in `periodMonth` is next due by the end of the month after
 * it — §Kebijakan 1's monthly cycle. Date-only arithmetic on a WITA date key,
 * so it never drifts across the UTC boundary the way a Date does.
 */
export function nextInspectionDueAfter(periodMonth: string): string {
  const [year, month] = periodMonth.split('-').map(Number)
  return periodMonthEnd(month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`)
}

/**
 * A round task's referenceId is `${outletId}__${periodMonth}` — one string, so
 * the monthly job can dedup with a single equality query and the round screen
 * can resolve its outlet and period without a second document. Same
 * deterministic-key reasoning shiftHandovers' doc id uses.
 */
export function roundReferenceId(outletId: string, periodMonth: string): string {
  return `${outletId}__${periodMonth}`
}

export function parseRoundReferenceId(referenceId: unknown): { outletId: string; periodMonth: string } {
  const parts = typeof referenceId === 'string' ? referenceId.split('__') : []
  if (parts.length !== 2 || !OUTLET_DEPARTMENTS[parts[0]] || !/^\d{4}-\d{2}$/.test(parts[1])) {
    throw new AppError('failed-precondition', 'That task is not a fire extinguisher inspection round.')
  }
  return { outletId: parts[0], periodMonth: parts[1] }
}

/**
 * §4.6 — the whole failure-handling rule set in one place, so the round screen
 * and the callable enforce the same thing and the node test can assert it
 * without an emulator.
 *
 * Every failure carries a note and a photo (the compliance record has to show
 * what went wrong, not merely that it ended up fine), gauge/seal-pin failures
 * are forced to `needsService`, and a pass or N/A cannot smuggle a resolution
 * through — those fields are written null regardless of what the client sent.
 */
export function validateInspectionItems(input: unknown): InspectionItem[] {
  if (!Array.isArray(input) || input.length !== CHECKLIST_KEYS.length) {
    throw new AppError('invalid-argument', `All ${CHECKLIST_KEYS.length} checklist items must be recorded.`)
  }

  const seen = new Set<string>()
  const items = input.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>
    const key = item.key as AparChecklistKey

    if (!CHECKLIST_KEYS.includes(key) || seen.has(key)) {
      throw new AppError('invalid-argument', `Unknown or duplicated checklist item: ${String(item.key)}.`)
    }
    seen.add(key)

    const result = item.result as ItemResult
    if (!ITEM_RESULTS.includes(result)) {
      throw new AppError('invalid-argument', `${key}: result must be one of ${ITEM_RESULTS.join(', ')}.`)
    }

    if (result !== 'fail') {
      return { key, result, note: null, photoFileId: null, resolution: null }
    }

    const note = typeof item.note === 'string' ? item.note.trim() : ''
    const photoFileId = typeof item.photoFileId === 'string' ? item.photoFileId.trim() : ''
    if (!note || !photoFileId) {
      throw new AppError('invalid-argument', `${key}: a failed item needs both a note and a photo.`)
    }

    // Forced rather than validated: a client that sends resolvedOnSpot for a
    // gauge failure is corrected, not argued with.
    const resolution: Resolution = FORCED_SERVICE_ITEMS.includes(key)
      ? 'needsService'
      : (item.resolution as Resolution)
    if (!RESOLUTIONS.includes(resolution)) {
      throw new AppError('invalid-argument', `${key}: resolution must be one of ${RESOLUTIONS.join(', ')}.`)
    }

    return { key, result, note, photoFileId, resolution }
  })

  return items
}

/** §4.3 — a self-resolved failure is still a failure in the unit's history. */
export function overallResultFor(items: InspectionItem[]): 'pass' | 'failResolved' | 'failNeedsService' {
  if (items.some((item) => item.resolution === 'needsService')) return 'failNeedsService'
  if (items.some((item) => item.result === 'fail')) return 'failResolved'
  return 'pass'
}
