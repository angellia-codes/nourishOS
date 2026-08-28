import { db, COLLECTIONS, AppError, todayIso } from '../../lib'
import { OUTLET_AREAS, OUTLET_CODES, OUTLET_DEPARTMENTS } from '../../lib/organization'
import { CATEGORY_BY_LOWER, CATEGORY_CODES, CATEGORY_CRITICALITY_DEFAULTS } from './constants'
import {
  EQUIPMENT_CRITICALITIES,
  type EquipmentCategory,
  type EquipmentCriticality,
  type EquipmentFields,
  type ExistingEquipmentRecord,
} from './types'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function optionalDate(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    throw new AppError('invalid-argument', `${field} must be a YYYY-MM-DD date.`)
  }
  return value
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/**
 * §5.4/§4.1 — resolves and validates criticality: blank/absent inherits the
 * category default (`criticalityOverridden: false`); a supplied value must be
 * a real enum member and is recorded as a deliberate override (AC #7).
 */
function resolveCriticality(
  category: EquipmentCategory,
  rawCriticality: unknown,
): { criticality: EquipmentCriticality; criticalityOverridden: boolean } {
  if (rawCriticality === undefined || rawCriticality === null || rawCriticality === '') {
    return { criticality: CATEGORY_CRITICALITY_DEFAULTS[category], criticalityOverridden: false }
  }
  const value = String(rawCriticality).trim() as EquipmentCriticality
  if (!EQUIPMENT_CRITICALITIES.includes(value)) {
    throw new AppError('invalid-argument', `criticality must be one of: ${EQUIPMENT_CRITICALITIES.join(', ')}.`)
  }
  return { criticality: value, criticalityOverridden: true }
}

/**
 * §3.2/§8 create/edit form validation, shared by createEquipment and
 * updateEquipment so the two can never drift (same precedent as
 * fireExtinguishers/helpers.ts's validateExtinguisherFields).
 *
 * `outletId` is validated by the caller — fixed at creation, and
 * transferEquipmentOutlet is the only path that ever changes it afterwards.
 * `status` and the decommission fields are server-owned, not accepted here.
 */
export function validateEquipmentFields(input: Record<string, unknown>, outletId: string): EquipmentFields {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name) {
    throw new AppError('invalid-argument', 'name is required.')
  }
  if (name.length > 120) {
    throw new AppError('invalid-argument', 'name must be at most 120 characters.')
  }

  const category = input.category as EquipmentCategory
  if (!CATEGORY_CODES[category]) {
    throw new AppError('invalid-argument', `category must be one of: ${Object.keys(CATEGORY_CODES).join(', ')}.`)
  }

  const area = typeof input.area === 'string' ? input.area : ''
  if (!OUTLET_AREAS[outletId]?.includes(area)) {
    throw new AppError('invalid-argument', 'That area does not belong to that outlet.')
  }

  const departmentId = typeof input.departmentId === 'string' && input.departmentId ? input.departmentId : null
  if (departmentId && !OUTLET_DEPARTMENTS[outletId]?.includes(departmentId)) {
    throw new AppError('invalid-argument', 'That department does not belong to that outlet.')
  }

  const { criticality, criticalityOverridden } = resolveCriticality(category, input.criticality)

  const installDate = optionalDate(input.installDate, 'installDate')
  if (installDate && installDate > todayIso()) {
    throw new AppError('invalid-argument', 'installDate cannot be in the future.')
  }

  return {
    name,
    category,
    equipmentType: optionalText(input.equipmentType),
    manufacturer: optionalText(input.manufacturer),
    model: optionalText(input.model),
    serialNumber: optionalText(input.serialNumber),
    outletId,
    area,
    locationDetail: optionalText(input.locationDetail),
    departmentId,
    criticality,
    criticalityOverridden,
    installDate,
    warrantyExpiryDate: optionalDate(input.warrantyExpiryDate, 'warrantyExpiryDate'),
    serviceVendorName: optionalText(input.serviceVendorName),
    notes: optionalText(input.notes),
  }
}

/** Serial numbers are unique across the whole collection when present (§3.2). */
export async function findEquipmentBySerial(
  serialNumber: string,
  excludeId?: string,
): Promise<FirebaseFirestore.QueryDocumentSnapshot | null> {
  const snap = await db
    .collection(COLLECTIONS.EQUIPMENT)
    .where('serialNumber', '==', serialNumber)
    .limit(2)
    .get()
  const match = snap.docs.find((doc) => doc.id !== excludeId)
  return match ?? null
}

const EQUIPMENT_CODE_SEQUENCE_DOC = 'equipmentAssetCodeSequences'

function codeSequenceKey(outletId: string, category: EquipmentCategory): string {
  return `${OUTLET_CODES[outletId]}_${CATEGORY_CODES[category]}`
}

function formatAssetCode(key: string, sequence: number): string {
  const [outletCode, categoryCode] = key.split('_')
  return `${outletCode}-${categoryCode}-${String(sequence).padStart(3, '0')}`
}

/**
 * §3.5 — `{OUTLET}-{CAT}-{NNN}`, sequential per outlet+category pair,
 * immutable after issue. Same transactional-counter shape as
 * fireExtinguishers/helpers.ts's allocateAssetCode, which mirrors
 * hr/employees/helpers.ts's allocateEmployeeNumber — one counter doc, keyed
 * fields, `merge: true`.
 */
export async function allocateEquipmentAssetCode(outletId: string, category: EquipmentCategory): Promise<string> {
  const key = codeSequenceKey(outletId, category)
  const counterRef = db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc(EQUIPMENT_CODE_SEQUENCE_DOC)

  const next = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const current = (snap.data()?.[key] as number | undefined) ?? 0
    const value = current + 1
    tx.set(counterRef, { [key]: value }, { merge: true })
    return value
  })

  return formatAssetCode(key, next)
}

/**
 * Bulk variant for §4 import: one transaction per distinct outlet+category
 * key present in the file (each transaction reserves the whole block that
 * key's rows need), not one per row — a 500-row import spanning 9 outlets x
 * 9 categories needs at most 81 transactions, never 500.
 */
export async function allocateEquipmentAssetCodes(
  entries: { outletId: string; category: EquipmentCategory }[],
): Promise<string[]> {
  const counterRef = db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc(EQUIPMENT_CODE_SEQUENCE_DOC)

  const groups = new Map<string, number[]>()
  entries.forEach((entry, index) => {
    const key = codeSequenceKey(entry.outletId, entry.category)
    groups.set(key, [...(groups.get(key) ?? []), index])
  })

  const codes = new Array<string>(entries.length)
  for (const [key, indices] of groups) {
    const startingValue = await db.runTransaction(async (tx) => {
      const snap = await tx.get(counterRef)
      const current = (snap.data()?.[key] as number | undefined) ?? 0
      tx.set(counterRef, { [key]: current + indices.length }, { merge: true })
      return current
    })
    indices.forEach((index, offset) => {
      codes[index] = formatAssetCode(key, startingValue + offset + 1)
    })
  }

  return codes
}

// ---------------------------------------------------------------------------
// §4 Bulk import
// ---------------------------------------------------------------------------

export interface EquipmentImportRow {
  rowNumber: number
  name: string
  category: EquipmentCategory
  outletId: string
  area: string
  equipmentType: string | null
  manufacturer: string | null
  model: string | null
  serialNumber: string | null
  locationDetail: string | null
  departmentId: string | null
  criticality: EquipmentCriticality
  criticalityOverridden: boolean
  installDate: string | null
  warrantyExpiryDate: string | null
  serviceVendorName: string | null
  notes: string | null
}

export interface EquipmentImportUpdateRow extends EquipmentImportRow {
  equipmentId: string
  assetCode: string
  changedFields: string[]
}

export interface EquipmentImportError {
  rowNumber: number
  column: string
  value: string
  message: string
}

export interface EquipmentImportWarning {
  rowNumber: number
  message: string
}

export interface EquipmentImportResult {
  totalRows: number
  inserts: EquipmentImportRow[]
  updates: EquipmentImportUpdateRow[]
  errors: EquipmentImportError[]
  warnings: EquipmentImportWarning[]
  canCommit: boolean
}

/** §4.5 — the preview token's only job is a 15-minute soft expiry; no server-side state is kept. */
export const PREVIEW_TOKEN_TTL_MS = 15 * 60 * 1000

export function issuePreviewToken(): string {
  return Buffer.from(JSON.stringify({ issuedAt: Date.now() })).toString('base64')
}

/**
 * §4.2 — commitEquipmentImport re-validates from scratch rather than trusting
 * a cached preview; the token's only real job is telling the operator "this
 * preview is stale, re-run it" if they sat on the tab too long.
 */
export function assertPreviewTokenFresh(previewToken: unknown): void {
  const token = typeof previewToken === 'string' ? previewToken : ''
  let issuedAt = 0
  try {
    issuedAt = (JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as { issuedAt?: number }).issuedAt ?? 0
  } catch {
    throw new AppError('invalid-argument', 'Invalid or expired preview token — re-run the preview.')
  }
  if (Date.now() - issuedAt > PREVIEW_TOKEN_TTL_MS) {
    throw new AppError('failed-precondition', 'This preview has expired — re-run the preview before committing.')
  }
}

export interface ExistingEquipmentIndex {
  bySerial: Map<string, ExistingEquipmentRecord>
  byAssetCode: Map<string, ExistingEquipmentRecord>
  /** `name|outletId|area` (name lowercased) → active/underRepair records — §4.4 duplicate warning. */
  byLocationKey: Map<string, ExistingEquipmentRecord[]>
}

function locationKey(name: string, outletId: string, area: string): string {
  return `${name.trim().toLowerCase()}|${outletId}|${area}`
}

/**
 * Reads the whole live register once. equipment-master-design.md never names
 * an expected volume, and this company operates 9 outlets — the same "dozens,
 * not thousands" assumption security/fireExtinguishers/fireExtinguisherService.ts
 * already makes for client-side outlet filtering. A full-collection read here
 * is what lets §4.3's row matching run against an in-memory index instead of
 * one query per CSV row.
 */
export async function buildExistingEquipmentIndex(): Promise<ExistingEquipmentIndex> {
  const snap = await db.collection(COLLECTIONS.EQUIPMENT).get()
  const bySerial = new Map<string, ExistingEquipmentRecord>()
  const byAssetCode = new Map<string, ExistingEquipmentRecord>()
  const byLocationKey = new Map<string, ExistingEquipmentRecord[]>()

  for (const doc of snap.docs) {
    const data = doc.data()
    const record: ExistingEquipmentRecord = {
      id: doc.id,
      assetCode: data.assetCode as string,
      status: data.status,
      name: data.name,
      category: data.category,
      equipmentType: data.equipmentType ?? null,
      manufacturer: data.manufacturer ?? null,
      model: data.model ?? null,
      serialNumber: data.serialNumber ?? null,
      outletId: data.outletId,
      area: data.area,
      locationDetail: data.locationDetail ?? null,
      departmentId: data.departmentId ?? null,
      criticality: data.criticality,
      criticalityOverridden: Boolean(data.criticalityOverridden),
      installDate: data.installDate ?? null,
      warrantyExpiryDate: data.warrantyExpiryDate ?? null,
      serviceVendorName: data.serviceVendorName ?? null,
      notes: data.notes ?? null,
    }
    byAssetCode.set(record.assetCode, record)
    if (record.serialNumber) bySerial.set(record.serialNumber, record)
    if (record.status !== 'decommissioned') {
      const key = locationKey(record.name, record.outletId, record.area)
      byLocationKey.set(key, [...(byLocationKey.get(key) ?? []), record])
    }
  }

  return { bySerial, byAssetCode, byLocationKey }
}

const FIELD_KEYS: (keyof EquipmentFields)[] = [
  'name',
  'category',
  'equipmentType',
  'manufacturer',
  'model',
  'serialNumber',
  'outletId',
  'area',
  'locationDetail',
  'departmentId',
  'criticality',
  'criticalityOverridden',
  'installDate',
  'warrantyExpiryDate',
  'serviceVendorName',
  'notes',
]

function diffFields(existing: ExistingEquipmentRecord, next: EquipmentImportRow): string[] {
  return FIELD_KEYS.filter((key) => existing[key] !== next[key as keyof EquipmentImportRow])
}

/**
 * §4.1-§4.4 — the whole two-phase pipeline's shared core: parse + validate +
 * branch insert/update + flag warnings, against an already-loaded existing
 * index. Called identically by previewEquipmentImport (writes nothing) and
 * commitEquipmentImport (re-validates from scratch before writing anything,
 * never trusting a client-supplied preview) — the "re-validates server-side"
 * guarantee §4.2 promises is this function running twice, not a cached result.
 */
export function validateImportRows(
  rawRows: Record<string, string>[],
  existing: ExistingEquipmentIndex,
): EquipmentImportResult {
  const errors: EquipmentImportError[] = []
  const warnings: EquipmentImportWarning[] = []
  const inserts: EquipmentImportRow[] = []
  const updates: EquipmentImportUpdateRow[] = []
  const seenSerials = new Map<string, number>()

  rawRows.forEach((raw, index) => {
    // §4.7 — row numbers reference the source file including its header row.
    const rowNumber = index + 2
    const rowErrors: EquipmentImportError[] = []

    const name = (raw.name ?? '').trim()
    if (!name) {
      rowErrors.push({ rowNumber, column: 'name', value: raw.name ?? '', message: 'name is required.' })
    } else if (name.length > 120) {
      rowErrors.push({ rowNumber, column: 'name', value: name, message: 'name must be at most 120 characters.' })
    }

    const category = CATEGORY_BY_LOWER[(raw.category ?? '').trim().toLowerCase()]
    if (!category) {
      rowErrors.push({
        rowNumber,
        column: 'category',
        value: raw.category ?? '',
        message: `category must be one of: ${Object.keys(CATEGORY_BY_LOWER).join(', ')}.`,
      })
    }

    const outletCodeRaw = (raw.outletCode ?? '').trim().toUpperCase()
    const outletId = Object.keys(OUTLET_CODES).find((id) => OUTLET_CODES[id] === outletCodeRaw)
    if (!outletId) {
      rowErrors.push({
        rowNumber,
        column: 'outletCode',
        value: raw.outletCode ?? '',
        message: 'outletCode did not resolve to a known outlet.',
      })
    }

    const area = (raw.area ?? '').trim()
    if (outletId && !OUTLET_AREAS[outletId]?.includes(area)) {
      rowErrors.push({
        rowNumber,
        column: 'area',
        value: raw.area ?? '',
        message: `area must be one of that outlet's configured areas: ${(OUTLET_AREAS[outletId] ?? []).join(', ')}.`,
      })
    }

    const departmentCodeRaw = (raw.departmentCode ?? '').trim()
    let departmentId: string | null = null
    if (departmentCodeRaw) {
      const match = outletId ? OUTLET_DEPARTMENTS[outletId]?.find((id) => id === departmentCodeRaw) : undefined
      if (!match) {
        rowErrors.push({
          rowNumber,
          column: 'departmentCode',
          value: departmentCodeRaw,
          message: 'departmentCode did not resolve to a department at that outlet.',
        })
      } else {
        departmentId = match
      }
    }

    let criticality: EquipmentCriticality | null = null
    let criticalityOverridden = false
    const criticalityRaw = (raw.criticality ?? '').trim()
    if (criticalityRaw) {
      if (!EQUIPMENT_CRITICALITIES.includes(criticalityRaw as EquipmentCriticality)) {
        rowErrors.push({
          rowNumber,
          column: 'criticality',
          value: criticalityRaw,
          message: `criticality must be blank or one of: ${EQUIPMENT_CRITICALITIES.join(', ')}.`,
        })
      } else {
        criticality = criticalityRaw as EquipmentCriticality
        criticalityOverridden = true
      }
    } else if (category) {
      criticality = CATEGORY_CRITICALITY_DEFAULTS[category]
    }

    let installDate: string | null = null
    const installDateRaw = (raw.installDate ?? '').trim()
    if (installDateRaw) {
      if (!ISO_DATE.test(installDateRaw)) {
        rowErrors.push({ rowNumber, column: 'installDate', value: installDateRaw, message: 'installDate must be YYYY-MM-DD.' })
      } else if (installDateRaw > todayIso()) {
        rowErrors.push({ rowNumber, column: 'installDate', value: installDateRaw, message: 'installDate cannot be in the future.' })
      } else {
        installDate = installDateRaw
      }
    }

    let warrantyExpiryDate: string | null = null
    const warrantyRaw = (raw.warrantyExpiryDate ?? '').trim()
    if (warrantyRaw) {
      if (!ISO_DATE.test(warrantyRaw)) {
        rowErrors.push({
          rowNumber,
          column: 'warrantyExpiryDate',
          value: warrantyRaw,
          message: 'warrantyExpiryDate must be YYYY-MM-DD.',
        })
      } else {
        warrantyExpiryDate = warrantyRaw
      }
    }

    const serialNumber = (raw.serialNumber ?? '').trim() || null
    const assetCodeRaw = (raw.assetCode ?? '').trim() || null

    if (serialNumber) {
      const firstSeenRow = seenSerials.get(serialNumber)
      if (firstSeenRow) {
        rowErrors.push({
          rowNumber,
          column: 'serialNumber',
          value: serialNumber,
          message: `Duplicate serialNumber — already used on row ${firstSeenRow} of this file.`,
        })
      } else {
        seenSerials.set(serialNumber, rowNumber)
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
      return
    }

    const row: EquipmentImportRow = {
      rowNumber,
      name,
      category: category!,
      outletId: outletId!,
      area,
      equipmentType: (raw.equipmentType ?? '').trim() || null,
      manufacturer: (raw.manufacturer ?? '').trim() || null,
      model: (raw.model ?? '').trim() || null,
      serialNumber,
      locationDetail: (raw.locationDetail ?? '').trim() || null,
      departmentId,
      criticality: criticality!,
      criticalityOverridden,
      installDate,
      warrantyExpiryDate,
      serviceVendorName: (raw.serviceVendorName ?? '').trim() || null,
      notes: (raw.notes ?? '').trim() || null,
    }

    // §4.3 row matching.
    const serialMatch = serialNumber ? existing.bySerial.get(serialNumber) : undefined
    if (serialMatch) {
      updates.push({ ...row, equipmentId: serialMatch.id, assetCode: serialMatch.assetCode, changedFields: diffFields(serialMatch, row) })
      return
    }
    if (!serialNumber && assetCodeRaw) {
      const codeMatch = existing.byAssetCode.get(assetCodeRaw)
      if (!codeMatch) {
        errors.push({
          rowNumber,
          column: 'assetCode',
          value: assetCodeRaw,
          message: 'No existing equipment found with that assetCode.',
        })
        return
      }
      updates.push({ ...row, equipmentId: codeMatch.id, assetCode: codeMatch.assetCode, changedFields: diffFields(codeMatch, row) })
      return
    }

    // INSERT — §4.4 mitigation 1: flag a probable duplicate, non-blocking.
    const collision = existing.byLocationKey.get(locationKey(row.name, row.outletId, row.area))
    if (collision && collision.length > 0) {
      warnings.push({
        rowNumber,
        message: `Possible duplicate: an active record with the same name, outlet and area already exists (${collision.map((c) => c.assetCode).join(', ')}). Review before committing.`,
      })
    }
    inserts.push(row)
  })

  return {
    totalRows: rawRows.length,
    inserts,
    updates,
    errors,
    warnings,
    canCommit: errors.length === 0,
  }
}
