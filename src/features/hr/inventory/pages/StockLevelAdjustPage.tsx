import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Spinner, Textarea } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useToast } from '@/hooks'
import * as inventoryService from '../inventoryService'
import { locationName } from '../inventoryFormat'
import type { InventoryItem, StockLevel } from '@/types'

/**
 * Corrects one stock-on-hand line to a counted figure, or removes the line by
 * counting it to zero. Routed rather than inline because this codebase has no
 * Dialog/Modal primitive and the adjustment needs a typed reason.
 *
 * Deliberately a stock count, not a free edit of the number: the callable
 * books the difference as a real `adjustment` movement, so the ledger stays
 * the explanation for every balance. That is why the reason is required.
 */
export function StockLevelAdjustPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { itemId } = useParams<{ itemId: string }>()
  // The level's doc id embeds the size label, which is free text and may contain
  // a slash ("XL / 42"), so it travels as a query param rather than a path segment.
  const [searchParams] = useSearchParams()
  const levelId = searchParams.get('level')

  const [item, setItem] = useState<InventoryItem | null>(null)
  const [level, setLevel] = useState<StockLevel | null>(null)
  const [loading, setLoading] = useState(true)
  const [counted, setCounted] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!itemId) return
    let cancelled = false
    void inventoryService.getInventoryItem(itemId).then((row) => {
      if (!cancelled) setItem(row)
    })
    return () => {
      cancelled = true
    }
  }, [itemId])

  // The level list is already a live subscription elsewhere; reuse it here so
  // the current figure can't be stale by the time the count is submitted.
  useEffect(() => {
    if (!itemId) return
    return inventoryService.subscribeToStockLevels(itemId, (rows) => {
      setLevel(rows.find((row) => row.id === levelId) ?? null)
      setLoading(false)
    })
  }, [itemId, levelId])

  // Seed the input from the server figure once, then leave it to the user.
  const [seeded, setSeeded] = useState(false)
  useEffect(() => {
    if (level && !seeded) {
      setCounted(String(level.quantityOnHand))
      setSeeded(true)
    }
  }, [level, seeded])

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!level || !itemId) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Stock line unavailable"
          description="That line may already have been removed, or your account can't read this register."
        />
      </div>
    )
  }

  const parsed = Number(counted)
  const valid = Number.isInteger(parsed) && parsed >= 0
  const delta = valid ? parsed - level.quantityOnHand : 0
  const canSubmit = valid && delta !== 0 && reason.trim() !== '' && !submitting

  async function submit(countedQuantity: number) {
    if (!itemId || !level) return
    setSubmitting(true)
    try {
      await inventoryService.adjustStockLevel({
        itemId,
        outletId: level.outletId,
        sizeVariant: level.sizeVariant,
        countedQuantity,
        reason: reason.trim(),
      })
      toast.success(countedQuantity === 0 ? 'Stock line removed.' : 'Stock on hand updated.')
      navigate(`/hr/inventory/${itemId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not adjust that stock line.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Adjust Stock on Hand</h1>
        <p className="text-sm text-muted-foreground">
          {item?.name ?? itemId} · {locationName(level.outletId)}
          {level.sizeVariant ? ` · ${level.sizeVariant}` : ''}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Counted quantity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            System shows <span className="font-mono tabular-nums text-foreground">{level.quantityOnHand}</span> on hand.
            Enter what you actually counted — the difference is recorded as an adjustment in the movement history, so
            the ledger still explains the balance.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="counted">Counted</Label>
            <Input
              id="counted"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
            />
            {valid && delta !== 0 && (
              <p className="text-xs text-muted-foreground">
                Records an adjustment of{' '}
                <span className="font-mono tabular-nums text-foreground">
                  {delta > 0 ? '+' : ''}
                  {delta}
                </span>
                .
              </p>
            )}
            {valid && delta === 0 && <p className="text-xs text-muted-foreground">Same as the current figure — nothing to record.</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              rows={2}
              maxLength={500}
              placeholder="e.g. Stock count 8 Sept — two damaged in storage"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => navigate(`/hr/inventory/${itemId}`)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={() => void submit(parsed)} disabled={!canSubmit}>
              Save count
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remove this line</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Counts this line to zero and removes it from Stock on hand. The write-off of{' '}
            <span className="font-mono tabular-nums text-foreground">{level.quantityOnHand}</span> stays in the movement
            history so there's still a record of what went and why. A reason is required.
          </p>
          <div className="flex justify-end">
            <Button
              variant="danger"
              onClick={() => void submit(0)}
              disabled={submitting || reason.trim() === '' || level.quantityOnHand === 0}
            >
              Set to zero and remove
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
