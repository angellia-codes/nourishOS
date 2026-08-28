import { OUTLETS, DEPARTMENTS, type OrgOption } from '@/constants/organization'
import type { InventoryCategory, InventoryItem, MovementType, StockMovement } from '@/types'

export interface InventoryCostRow {
  outletId: string
  outletName: string
  departmentId: string | null
  departmentName: string
  itemId: string
  itemName: string
  category: InventoryCategory
  periodMonth: string
  quantity: number
  totalCost: number
}

function labelFor(id: string, source: readonly OrgOption[]): string {
  return source.find((option) => option.id === id)?.name ?? id
}

/**
 * Generalizes the deleted manningCost.ts's outlet-only, receive-only
 * aggregation: grouped by outlet + department + item + month, any movement
 * type. `category` comes from the parent InventoryItem — StockMovement
 * itself carries no category field. `departmentId` is `issuedToDepartmentId`,
 * populated only on `movementType === 'issue'` rows; other rows show '—'
 * rather than being dropped, so `opts.movementType = 'receive'` still
 * reproduces the old procurement-spend view.
 */
export function buildInventoryCostRows(
  movements: StockMovement[],
  items: InventoryItem[],
  opts?: { movementType?: MovementType; outletId?: string; departmentId?: string; itemId?: string; periodMonth?: string },
): InventoryCostRow[] {
  const itemById = new Map(items.map((i) => [i.id, i]))
  const groups = new Map<string, InventoryCostRow>()

  for (const movement of movements) {
    if (opts?.movementType && movement.movementType !== opts.movementType) continue
    if (opts?.outletId && movement.outletId !== opts.outletId) continue
    if (opts?.itemId && movement.itemId !== opts.itemId) continue

    const item = itemById.get(movement.itemId)
    const departmentId = movement.issuedToDepartmentId
    if (opts?.departmentId && departmentId !== opts.departmentId) continue

    const periodMonth = movement.createdAt.slice(0, 7)
    if (opts?.periodMonth && periodMonth !== opts.periodMonth) continue

    const key = `${movement.outletId}::${departmentId ?? '—'}::${movement.itemId}::${periodMonth}`
    let row = groups.get(key)
    if (!row) {
      row = {
        outletId: movement.outletId,
        outletName: labelFor(movement.outletId, OUTLETS),
        departmentId,
        departmentName: departmentId ? labelFor(departmentId, DEPARTMENTS) : '—',
        itemId: movement.itemId,
        itemName: item?.name ?? movement.itemId,
        category: item?.category ?? 'other',
        periodMonth,
        quantity: 0,
        totalCost: 0,
      }
      groups.set(key, row)
    }
    row.quantity += Math.abs(movement.quantityDelta)
    row.totalCost += Math.abs(movement.totalCost)
  }

  return Array.from(groups.values()).sort(
    (a, b) =>
      a.outletName.localeCompare(b.outletName) ||
      a.departmentName.localeCompare(b.departmentName) ||
      a.itemName.localeCompare(b.itemName) ||
      a.periodMonth.localeCompare(b.periodMonth),
  )
}
