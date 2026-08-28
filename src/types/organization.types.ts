import type { BaseDocument } from './firestore.types'

/**
 * training-module-spec-v1.0.md §4.1 — the group-wide taxonomy, seeded from the
 * training master sheet (`dept-bar`, `dept-kitchen`, …) and owned jointly with
 * Positions Master.
 *
 * These ids are NOT the `departmentId` an employee record carries — the app's
 * own 14-department vocabulary (`src/constants/organization.ts`) stayed put.
 * `TRAINING_DEPARTMENT_BY_ORG` maps between the two.
 */
export interface Department extends BaseDocument {
  /** Provenance from the master sheet, e.g. 'F&B SERVICE'. */
  sourceKey: string
  name: { en: string; id: string | null }
  sortOrder: number
}

export interface Outlet extends BaseDocument {
  code: string
  name: string
  /** "Head Office" | "Outlet" — kept as string to allow new outlet types without a type-level change. */
  type: string
  address?: string
  operatingHours?: string
  managerId?: string
}
