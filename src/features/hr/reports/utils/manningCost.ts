import { OUTLETS, type OrgOption } from '@/constants/organization'
import type { StockMovement } from '@/types'

export interface ManningCostRow {
  outletId: string
  outletName: string
  totalCost: number
  movementCount: number
}

function labelFor(id: string, source: readonly OrgOption[]): string {
  return source.find((option) => option.id === id)?.name ?? id
}

/**
 * Sums receive-movement cost (uniform/asset procurement spend, not payroll —
 * see CLAUDE.md on why HR Reports has no compensation data) by outlet,
 * optionally bounded to an ISO date range on `createdAt`.
 */
export function buildManningCostRows(
  movements: StockMovement[],
  range?: { from?: string; to?: string },
): ManningCostRow[] {
  const groups = new Map<string, ManningCostRow>()

  for (const movement of movements) {
    if (movement.movementType !== 'receive') continue
    if (range?.from && movement.createdAt < range.from) continue
    if (range?.to && movement.createdAt > range.to) continue

    let row = groups.get(movement.outletId)
    if (!row) {
      row = { outletId: movement.outletId, outletName: labelFor(movement.outletId, OUTLETS), totalCost: 0, movementCount: 0 }
      groups.set(movement.outletId, row)
    }
    row.totalCost += movement.totalCost
    row.movementCount += 1
  }

  return Array.from(groups.values()).sort((a, b) => a.outletName.localeCompare(b.outletName))
}
