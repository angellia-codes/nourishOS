import { useEffect, useMemo, useState } from 'react'
import { Input, Spinner } from '@/components/ui'
import { EmptyState, ReportTable, type ReportTableColumn } from '@/components/shared'
import { formatCurrency } from '@/utils'
import * as inventoryService from '@/features/hr/inventory/inventoryService'
import { buildManningCostRows, type ManningCostRow } from '../utils/manningCost'
import type { StockMovement } from '@/types'

const COLUMNS: ReportTableColumn<ManningCostRow>[] = [
  { header: 'Outlet', value: (r) => r.outletName },
  { header: 'Receipts', value: (r) => String(r.movementCount), align: 'right' },
  { header: 'Total Cost', value: (r) => formatCurrency(r.totalCost), align: 'right' },
]

/**
 * hr.md §16 — uniform and asset procurement spend by outlet. Not payroll: see
 * CLAUDE.md on why HR Reports has no compensation data.
 */
export function ManningCostReportPage() {
  const [movements, setMovements] = useState<StockMovement[] | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    return inventoryService.subscribeToAllStockMovements(setMovements)
  }, [])

  const rows = useMemo(
    () => buildManningCostRows(movements ?? [], { from: fromDate || undefined, to: toDate || undefined }),
    [movements, fromDate, toDate],
  )
  const total = useMemo(() => rows.reduce((sum, r) => sum + r.totalCost, 0), [rows])

  if (movements === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Manning Cost Report</h1>
        <p className="text-sm text-muted-foreground">
          Uniform and asset procurement spend, by outlet. {rows.length > 0 && `Total: ${formatCurrency(total)}.`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="From date" />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="To date" />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No spend recorded" description="No stock receipts match this date range." />
      ) : (
        <ReportTable columns={COLUMNS} rows={rows} rowKey={(r) => r.outletId} />
      )}
    </div>
  )
}
