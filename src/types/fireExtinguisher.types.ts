import type { BaseDocument } from './firestore.types'

/** fire-extinguisher.md §3 — the canonical six-item monthly checklist. */
export type AparChecklistKey = 'accessibility' | 'bodyHandle' | 'pressureGauge' | 'sealPin' | 'nozzle' | 'labelTag'

/** Attachment II's V / X / N/A legend, kept so the guard's mental model transfers. */
export type AparItemResult = 'pass' | 'fail' | 'notApplicable'

export type AparResolution = 'resolvedOnSpot' | 'needsService'

export type ExtinguisherType = 'powder' | 'co2' | 'foam' | 'wetChemical'

export type ExtinguisherStatus = 'active' | 'needsService' | 'discharged' | 'expired' | 'retired'

/**
 * One physical cylinder (§2.1 — `qty` is not a field anywhere in this module;
 * counts are derived). The first block of fields is the migration-shaped set
 * §2.2 reserves so a future generic `equipment` module absorbs this as a
 * collection move rather than a rewrite — do not rename them.
 *
 * Dates arrive as strings: `expiryDate` and friends are stored as 'YYYY-MM-DD'
 * date keys (the expiry sweep matches them exactly, WITA), while
 * `lastInspectedAt` is a server Timestamp converted to an ISO string by
 * normalizeTimestamps at the read boundary.
 */
export interface FireExtinguisher extends BaseDocument {
  assetCode: string
  outletId: string
  departmentId: string
  locationLabel: string
  status: ExtinguisherStatus
  lastInspectedAt: string | null
  nextInspectionDue: string
  extinguisherType: ExtinguisherType
  weightKg: number
  serialNumber: string | null
  manufactureDate: string | null
  installedAt: string
  expiryDate: string
  lastRefillDate: string | null
  nextHydrostaticTestDate: string | null
  /** §12 — reserved; QR scanning is out of MVP and guards pick from the round list. */
  qrCode: string | null
  /** Set by retireFireExtinguisher only. */
  retiredReason?: string | null
}

export interface AparInspectionItem {
  key: AparChecklistKey
  result: AparItemResult
  /** Mandatory when `result` is 'fail' (§4.6), null otherwise. */
  note: string | null
  photoFileId: string | null
  resolution: AparResolution | null
}

/**
 * One unit, one month. The doc id is `${extinguisherId}__${periodMonth}`, which
 * is how §4.3's uniqueness key is enforced without a query.
 */
export interface FireExtinguisherInspection extends BaseDocument {
  extinguisherId: string
  assetCode: string
  roundTaskId: string
  outletId: string
  /** '2026-08' — the round's period, not the submission date. */
  periodMonth: string
  inspectedByUid: string
  inspectedByName: string | null
  inspectedAt: string
  items: AparInspectionItem[]
  overallResult: 'pass' | 'failResolved' | 'failNeedsService'
  workOrderId: string | null
  remarks: string | null
}
