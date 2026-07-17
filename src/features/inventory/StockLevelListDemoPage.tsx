import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Package, Plus } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { INVENTORY_LOCATIONS, MOCK_STOCK_ITEMS, MOCK_STOCK_LEVELS, availableStock } from './inventoryDemoData'
import { STOCK_CATEGORY_LABELS, STORAGE_CONDITION_LABELS, formatInventoryDate } from './inventoryFormat'

function locationName(locationId: string): string {
  return INVENTORY_LOCATIONS.find((l) => l.id === locationId)?.name ?? locationId
}

/**
 * Read-only visual preview of Stock Levels — inventory.md §6/§7 "Stock Item
 * Master" and "Stock Levels", plus §15 "Reorder Management" alerts. Mock
 * data, no Firestore subscription, no backend calls.
 */
export function StockLevelListDemoPage() {
  const navigate = useNavigate()
  const rows = MOCK_STOCK_LEVELS.map((level) => ({
    level,
    item: MOCK_STOCK_ITEMS.find((i) => i.id === level.itemId),
  })).filter((row) => row.item)
  const lowStockCount = rows.filter((row) => row.item && row.level.currentStock <= row.item.reorderLevel).length

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-4xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. The real, auth-protected version will live at /inventory.
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Stock Levels</h1>
            <p className="text-sm text-muted-foreground">Current inventory per item and location — inventory.md §7.</p>
          </div>
          <Button onClick={() => navigate('/demo/inventory/movements/new')}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Log Stock Movement
          </Button>
        </div>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                lowStockCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
              }`}
            >
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{lowStockCount} item(s) at or below reorder level</p>
              <p className="text-xs text-muted-foreground">inventory.md §15 — Reorder Management</p>
            </div>
          </CardContent>
        </Card>

        {rows.length === 0 ? (
          <EmptyState title="No stock levels yet" icon={<Package className="h-8 w-8" aria-hidden="true" />} />
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map(({ level, item }) => {
              if (!item) return null
              const low = level.currentStock <= item.reorderLevel
              return (
                <Card key={`${item.id}-${level.locationId}`}>
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {item.name}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">{item.sku}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {locationName(level.locationId)} &middot; {STOCK_CATEGORY_LABELS[item.category]} &middot;{' '}
                          {STORAGE_CONDITION_LABELS[item.storageCondition]} &middot; Updated {formatInventoryDate(level.lastUpdated)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-xs text-muted-foreground">Available</p>
                          <p className="text-sm font-medium text-foreground">
                            {availableStock(level)} {item.unit}
                          </p>
                        </div>
                        {low && <Badge variant="error">Reorder</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
