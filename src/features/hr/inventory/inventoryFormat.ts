import { PackagePlus, PackageMinus, PackageX, ArrowLeftRight, ArrowRightLeft, Wrench, type LucideIcon } from 'lucide-react'
import type { StatusTone } from '@/components/ui'
import { DEPARTMENTS, OUTLETS } from '@/constants/organization'
import { POSITION_LABELS } from '@/constants/positions'
import type { InventoryCategory, MovementType, StockMovement } from '@/types'

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  uniform: 'Uniform',
  safetyShoes: 'Safety Shoes',
  apron: 'Apron',
  hat: 'Hat',
  equipment: 'Equipment',
  electronics: 'Electronics',
  bikeSeatCover: 'Bike Seat Cover',
  handTowelGreen: 'Hand Towel Green',
  handTowelBlack: 'Hand Towel Black',
  nametag: 'Nametag',
  other: 'Other',
}

/** Central store all uniform/asset stock is received into, issued from, and transferred out of — mirrors functions/src/hr/inventory/helpers.ts's HR_STORE_ID. Not a real outlet, so it stays out of OUTLETS. */
export const HR_STORE_ID = 'hr_store'
export const HR_STORE_NAME = 'HR Store'

/** Resolves an outletId for display, including the synthetic HR Store location that OUTLETS doesn't carry. */
export function locationName(outletId: string): string {
  if (outletId === HR_STORE_ID) return HR_STORE_NAME
  return OUTLETS.find((o) => o.id === outletId)?.name ?? outletId
}

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  receive: 'Received',
  issue: 'Issued',
  return: 'Returned',
  transferOut: 'Transferred out',
  transferIn: 'Transferred in',
  adjustment: 'Adjusted',
}

export const MOVEMENT_TYPE_TONE: Record<MovementType, StatusTone> = {
  receive: 'success',
  return: 'success',
  transferIn: 'success',
  issue: 'info',
  transferOut: 'info',
  adjustment: 'warning',
}

export const MOVEMENT_TYPE_ICON: Record<MovementType, LucideIcon> = {
  receive: PackagePlus,
  return: PackagePlus,
  issue: PackageMinus,
  transferOut: ArrowRightLeft,
  transferIn: ArrowLeftRight,
  adjustment: Wrench,
}

/** IDR has no minor unit in practice — matches expenseFormat.ts's formatter. */
export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * "Item out for {employee} · {outlet} · {department} · {position}" — reads
 * off the issuedTo* fields snapshotted onto the movement at issue time, not
 * a live join back to employees/. Returns null for movements with no
 * target at all (write-offs, adjustments, receives, outlet-to-outlet
 * transfers). A direct department transfer has issuedToDepartmentId but no
 * employee — renders as "Item out for {department}" instead.
 */
export function formatIssuedTo(movement: StockMovement): string | null {
  const department = movement.issuedToDepartmentId
    ? (DEPARTMENTS.find((d) => d.id === movement.issuedToDepartmentId)?.name ?? movement.issuedToDepartmentId)
    : null

  if (!movement.issuedToEmployeeId || !movement.issuedToEmployeeName) {
    return department ? `Item out for ${department}` : null
  }

  const outlet = locationName(movement.outletId)
  const position = movement.issuedToPosition
    ? (POSITION_LABELS[movement.issuedToPosition as keyof typeof POSITION_LABELS] ?? movement.issuedToPosition)
    : null
  const target = [movement.issuedToEmployeeName, outlet, department, position].filter(Boolean).join(' · ')
  return `Item out for ${target}`
}

/** "{qty} x {unit cost} = {total cost}" for the movement history line. */
export function formatMovementCost(movement: StockMovement): string {
  const qty = Math.abs(movement.quantityDelta)
  return `${qty} x ${formatIdr(movement.unitCost)} = ${formatIdr(Math.abs(movement.totalCost))}`
}
