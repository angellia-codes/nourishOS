import { PackagePlus, PackageMinus, PackageX, ArrowLeftRight, ArrowRightLeft, Wrench, type LucideIcon } from 'lucide-react'
import type { StatusTone } from '@/components/ui'
import type { InventoryCategory, MovementType } from '@/types'

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  uniform: 'Uniform',
  idCard: 'ID Card',
  keys: 'Keys',
  equipment: 'Equipment',
  electronics: 'Electronics',
  other: 'Other',
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
