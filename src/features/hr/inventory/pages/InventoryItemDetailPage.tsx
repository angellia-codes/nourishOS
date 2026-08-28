import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRightLeft, Lock, Pencil, PackageMinus, PackagePlus } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  StatusPill,
  Timeline,
  TimelineItem,
} from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import { useFirestoreDoc } from '@/hooks'
import { formatDateTime } from '@/utils'
import * as inventoryService from '../inventoryService'
import {
  INVENTORY_CATEGORY_LABELS,
  MOVEMENT_TYPE_ICON,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_TONE,
  formatIdr,
  formatIssuedTo,
  formatMovementCost,
  locationName,
} from '../inventoryFormat'
import type { InventoryItem, StockLevel, StockMovement } from '@/types'

/** Item info, stock levels by outlet/size, and the append-only movement ledger. */
export function InventoryItemDetailPage() {
  const navigate = useNavigate()
  const { itemId } = useParams<{ itemId: string }>()

  const { data: item, loading, error } = useFirestoreDoc<InventoryItem>(COLLECTIONS.HR_INVENTORY_ITEMS, itemId)
  const [levels, setLevels] = useState<StockLevel[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])

  useEffect(() => {
    if (!itemId) return
    return inventoryService.subscribeToStockLevels(itemId, setLevels)
  }, [itemId])

  useEffect(() => {
    if (!itemId) return
    return inventoryService.subscribeToStockMovements(itemId, setMovements)
  }, [itemId])

  const totalOnHand = useMemo(() => levels.reduce((sum, l) => sum + l.quantityOnHand, 0), [levels])

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (error || !item || !itemId) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Item unavailable"
          description="That item may have been removed, or your account can't read this register."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Button variant="ghost" className="self-start" onClick={() => navigate('/hr/inventory')}>
        <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
        Inventory
      </Button>

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">{INVENTORY_CATEGORY_LABELS[item.category]}</Badge>
            {item.isArchived && <Badge variant="warning">Archived</Badge>}
          </div>
          <CardTitle>{item.name}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {formatIdr(item.unitCost)} each · {totalOnHand} on hand across all outlets
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap justify-end gap-2">
          <PermissionGuard permission={PERMISSIONS.HR_INVENTORY_MANAGE}>
            <Button variant="secondary" onClick={() => navigate(`/hr/inventory/${itemId}/edit`)}>
              <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.HR_INVENTORY_RECORD}>
            <Button variant="secondary" onClick={() => navigate(`/hr/inventory/${itemId}/receive`)}>
              <PackagePlus className="mr-1 h-4 w-4" aria-hidden="true" />
              Receive
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/hr/inventory/${itemId}/issue`)}>
              <PackageMinus className="mr-1 h-4 w-4" aria-hidden="true" />
              Issue
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/hr/inventory/${itemId}/transfer`)}>
              <ArrowRightLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              Transfer
            </Button>
          </PermissionGuard>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock on hand</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {levels.filter((l) => l.quantityOnHand > 0).length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock on hand yet — receive some to get started.</p>
          ) : (
            levels
              .filter((l) => l.quantityOnHand > 0)
              .map((level) => (
                <div key={level.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-foreground">
                    {locationName(level.outletId)}
                    {level.sizeVariant && ` · ${level.sizeVariant}`}
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">{level.quantityOnHand}</span>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      {movements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Movement history</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline>
              {movements.map((movement) => {
                const issuedTo = formatIssuedTo(movement)
                return (
                  <TimelineItem
                    key={movement.id}
                    title={
                      <span className="flex flex-col gap-1">
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <StatusPill
                            tone={MOVEMENT_TYPE_TONE[movement.movementType]}
                            icon={MOVEMENT_TYPE_ICON[movement.movementType]}
                            label={MOVEMENT_TYPE_LABELS[movement.movementType]}
                          />
                          <span className="font-mono tabular-nums text-foreground">
                            {movement.quantityDelta > 0 ? '+' : ''}
                            {movement.quantityDelta}
                            {movement.sizeVariant && ` (${movement.sizeVariant})`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {locationName(movement.outletId)} · {movement.reason}
                          </span>
                        </span>
                        {issuedTo && <span className="text-xs text-muted-foreground">{issuedTo}</span>}
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {formatMovementCost(movement)}
                        </span>
                      </span>
                    }
                    timestamp={formatDateTime(movement.createdAt)}
                  />
                )
              })}
            </Timeline>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
