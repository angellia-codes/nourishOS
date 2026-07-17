import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import { INVENTORY_LOCATIONS, MOCK_STOCK_ITEMS, type MovementType } from './inventoryDemoData'
import { MOVEMENT_TYPE_LABELS } from './inventoryFormat'

const MOVEMENT_TYPE_OPTIONS = Object.entries(MOVEMENT_TYPE_LABELS) as [MovementType, string][]

/** inventory.md §8 — which location fields a movement type needs. */
function needsSource(type: MovementType): boolean {
  return type === 'out' || type === 'transfer' || type === 'waste' || type === 'adjustment'
}
function needsDestination(type: MovementType): boolean {
  return type === 'in' || type === 'transfer' || type === 'return'
}

/**
 * Read-only-except-for-the-form visual preview of the Stock Movement entry
 * form — inventory.md §8 "Stock Movements". Mock data, no Firestore/Cloud
 * Function calls.
 */
export function StockMovementFormDemoPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [itemId, setItemId] = useState(MOCK_STOCK_ITEMS[0].id)
  const [type, setType] = useState<MovementType>('in')
  const [quantity, setQuantity] = useState('')
  const [sourceLocationId, setSourceLocationId] = useState(INVENTORY_LOCATIONS[0].id)
  const [destinationLocationId, setDestinationLocationId] = useState(INVENTORY_LOCATIONS[0].id)
  const [notes, setNotes] = useState('')

  const isValid =
    Number(quantity) > 0 &&
    (!needsSource(type) || sourceLocationId !== '') &&
    (!needsDestination(type) || destinationLocationId !== '') &&
    (type !== 'out' && type !== 'waste' ? true : notes.trim().length > 0)

  function handleSubmit() {
    if (!isValid) return
    toast.success('Stock movement recorded (demo) — stock levels update server-side in the real flow; nothing was written to a backend.')
    navigate('/demo/inventory')
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Submitting shows a toast and returns to the list; nothing is persisted.
      </div>

      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/inventory')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Log Stock Movement</h1>
            <p className="text-sm text-muted-foreground">Records an IN / OUT / TRANSFER / ADJUSTMENT / WASTE / RETURN event.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Movement Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item">Item *</Label>
                <Select id="item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
                  {MOCK_STOCK_ITEMS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.sku})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="type">Type *</Label>
                <Select id="type" value={type} onChange={(e) => setType(e.target.value as MovementType)}>
                  {MOVEMENT_TYPE_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input id="quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {needsSource(type) && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="source">Source Location *</Label>
                  <Select id="source" value={sourceLocationId} onChange={(e) => setSourceLocationId(e.target.value)}>
                    {INVENTORY_LOCATIONS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {needsDestination(type) && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="destination">Destination Location *</Label>
                  <Select id="destination" value={destinationLocationId} onChange={(e) => setDestinationLocationId(e.target.value)}>
                    {INVENTORY_LOCATIONS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">
                Notes {(type === 'out' || type === 'waste') && '*'}
                {(type === 'out' || type === 'waste') && (
                  <span className="ml-1 font-normal text-muted-foreground">— justification required for stock out/waste</span>
                )}
              </Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/demo/inventory')}>
            Cancel
          </Button>
          <Button type="button" disabled={!isValid} onClick={handleSubmit}>
            Record Movement
          </Button>
        </div>
      </div>
    </div>
  )
}
