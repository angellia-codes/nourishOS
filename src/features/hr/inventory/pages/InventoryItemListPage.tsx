import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boxes, Plus } from 'lucide-react'
import { Badge, Button, Card, CardContent, Spinner } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import * as inventoryService from '../inventoryService'
import { INVENTORY_CATEGORY_LABELS, formatIdr } from '../inventoryFormat'
import type { InventoryItem, StockLevel } from '@/types'

/** hr.md §12 — the HR Inventory catalog: uniforms and simple assets as a stock ledger. */
export function InventoryItemListPage() {
  const navigate = useNavigate()

  const [items, setItems] = useState<InventoryItem[] | null>(null)
  const [levels, setLevels] = useState<StockLevel[]>([])

  useEffect(() => inventoryService.subscribeToInventoryItems((next) => setItems(next)), [])
  useEffect(() => inventoryService.subscribeToAllStockLevels((next) => setLevels(next)), [])

  const onHandByItem = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const level of levels) {
      totals[level.itemId] = (totals[level.itemId] ?? 0) + level.quantityOnHand
    }
    return totals
  }, [levels])

  if (items === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const active = items.filter((item) => !item.isArchived)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">Uniform and asset stock, movements and cost.</p>
        </div>
        <PermissionGuard permission={PERMISSIONS.HR_INVENTORY_MANAGE}>
          <Button onClick={() => navigate('/hr/inventory/new')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            New Item
          </Button>
        </PermissionGuard>
      </div>

      {active.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-8 w-8" aria-hidden="true" />}
          title="No items yet"
          description="Add a uniform or asset to start tracking its stock."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {active.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <button
                  type="button"
                  onClick={() => navigate(`/hr/inventory/${item.id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {INVENTORY_CATEGORY_LABELS[item.category]} · {formatIdr(item.unitCost)} each
                  </p>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                    {onHandByItem[item.id] ?? 0} on hand
                  </span>
                  <Badge variant="neutral">{item.hasSizes ? `${item.sizes.length} sizes` : 'No sizes'}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
