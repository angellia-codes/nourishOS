import type { BaseDocument } from './firestore.types'

export interface Department extends BaseDocument {
  code: string
  name: string
  description?: string
  managerId?: string
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
