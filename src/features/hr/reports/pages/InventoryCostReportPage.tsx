import { useEffect, useMemo, useState } from 'react'
import { Select, Spinner } from '@/components/ui'
import { EmptyState, ReportTable, BarDiagram, type ReportTableColumn } from '@/components/shared'
import { OUTLETS, DEPARTMENTS } from '@/constants'
import { formatCurrency } from '@/utils'
import { INVENTORY_CATEGORY_LABELS } from '@/features/hr/inventory/inventoryFormat'
import * as inventoryService from '@/features/hr/inventory/inventoryService'
import { buildInventoryCostRows, type InventoryCostRow } from '../utils/inventoryCost'
import type { InventoryItem, MovementType, StockMovement } from '@/types'

const MOVEMENT_TYPE_OPTIONS: { value: MovementType | ''; label: string }[] = [
  { value: 'issue', label: 'Issued' },
  { value: 'receive', label: 'Received' },
  { value: '', label: 'All' },
]

type RankBy = 'item' | 'department' | 'outlet'

const COLUMNS: ReportTableColumn<InventoryCostRow>[] = [
  { header: 'Outlet', value: (r) => r.outletName },
  { header: 'Department', value: (r) => r.departmentName },
  { header: 'Item', value: (r) => r.itemName },
  { header: 'Category', value: (r) => INVENTORY_CATEGORY_LABELS[r.category] ?? r.category },
  { header: 'Month', value: (r) => r.periodMonth },
  { header: 'Qty', value: (r) => String(r.quantity), align: 'right' },
  { header: 'Total Cost', value: (r) => formatCurrency(r.totalCost), align: 'right' },
]

/** Uniform/asset cost by outlet, department, item and month — supersedes the old outlet-only, receive-only Manning Cost report. */
export function InventoryCostReportPage() {
  const [movements, setMovements] = useState<StockMovement[] | null>(null)
  const [items, setItems] = useState<InventoryItem[] | null>(null)
  const [movementType, setMovementType] = useState<MovementType | ''>('issue')
  const [outletId, setOutletId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [itemId, setItemId] = useState('')
  const [periodMonth, setPeriodMonth] = useState('')
  const [rankBy, setRankBy] = useState<RankBy>('item')

  useEffect(() => inventoryService.subscribeToAllStockMovements(setMovements), [])
  useEffect(() => inventoryService.subscribeToInventoryItems(setItems), [])

  const rows = useMemo(() => {
    if (!movements || !items) return []
    return buildInventoryCostRows(movements, items, {
      movementType: movementType || undefined,
      outletId: outletId || undefined,
      departmentId: departmentId || undefined,
      itemId: itemId || undefined,
      periodMonth: periodMonth || undefined,
    })
  }, [movements, items, movementType, outletId, departmentId, itemId, periodMonth])

  const chartItems = useMemo(() => {
    const totals = new Map<string, number>()
    for (const row of rows) {
      const label = rankBy === 'item' ? row.itemName : rankBy === 'department' ? row.departmentName : row.outletName
      totals.set(label, (totals.get(label) ?? 0) + row.totalCost)
    }
    return Array.from(totals.entries()).map(([label, value]) => ({ label, value }))
  }, [rows, rankBy])

  if (movements === null || items === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Inventory Cost Report</h1>
        <p className="text-sm text-muted-foreground">Uniform and asset cost by outlet, department, item and month.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Select value={movementType} onChange={(e) => setMovementType(e.target.value as MovementType | '')} aria-label="Movement type">
          {MOVEMENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select value={outletId} onChange={(e) => setOutletId(e.target.value)} aria-label="Filter by outlet">
          <option value="">All outlets</option>
          {OUTLETS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
        <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} aria-label="Filter by department">
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select value={itemId} onChange={(e) => setItemId(e.target.value)} aria-label="Filter by item">
          <option value="">All items</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </Select>
        <input
          type="month"
          value={periodMonth}
          onChange={(e) => setPeriodMonth(e.target.value)}
          aria-label="Filter by month"
          className="h-12 rounded-md border border-border bg-sunken px-3 text-sm text-foreground"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No movements match these filters" />
      ) : (
        <>
          <ReportTable
            columns={COLUMNS}
            rows={rows}
            rowKey={(r) => `${r.outletId}::${r.departmentId}::${r.itemId}::${r.periodMonth}`}
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-medium text-foreground">Highest to Lowest</h2>
              <Select value={rankBy} onChange={(e) => setRankBy(e.target.value as RankBy)} aria-label="Rank by" className="w-40">
                <option value="item">By Item</option>
                <option value="department">By Department</option>
                <option value="outlet">By Outlet</option>
              </Select>
            </div>
            <BarDiagram items={chartItems} valueFormatter={formatCurrency} />
          </div>
        </>
      )}
    </div>
  )
}
