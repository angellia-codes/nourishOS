import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { COLLECTIONS } from '@/constants'
import { useFirestoreDoc, useToast } from '@/hooks'
import { subscribeToEmployees } from '@/features/hr/services/employeeService'
import * as inventoryService from '../inventoryService'
import { MOVEMENT_TYPE_LABELS, locationName } from '../inventoryFormat'
import type { Employee, InventoryItem, StockMovement } from '@/types'

/**
 * Corrects or withdraws one ledger entry — the only write path in this module
 * gated on hrInventory.manage rather than hrInventory.record, so recording a
 * movement stays a daily outlet-leader act while unpicking one is HR's.
 *
 * A routed page, not a dialog: this codebase has no Dialog/Modal primitive,
 * and voiding needs a typed reason rather than a bare confirm.
 *
 * Only the fields a mis-key actually gets wrong are editable — quantity, size,
 * reason, recipient. Location and movement type are not: changing either would
 * mean reversing one stock level and applying another somewhere else, which is
 * what void-and-re-record already does correctly.
 */
export function StockMovementEditPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { itemId, movementId } = useParams<{ itemId: string; movementId: string }>()

  const { data: movement, loading, error } = useFirestoreDoc<StockMovement>(COLLECTIONS.HR_STOCK_MOVEMENTS, movementId)
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])

  const [quantity, setQuantity] = useState('')
  const [sizeVariant, setSizeVariant] = useState('')
  const [reason, setReason] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [voidReason, setVoidReason] = useState('')
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

  // Prefill once the movement arrives — the callable is a full replacement, so
  // every editable field has to be submitted whether or not it changed.
  useEffect(() => {
    if (!movement) return
    setQuantity(String(Math.abs(movement.quantityDelta)))
    setSizeVariant(movement.sizeVariant ?? '')
    setReason(movement.reason)
    setEmployeeId(movement.issuedToEmployeeId ?? '')
  }, [movement])

  const issuedToEmployee = Boolean(movement?.issuedToEmployeeId)
  useEffect(() => {
    if (!issuedToEmployee) return
    return subscribeToEmployees(setEmployees)
  }, [issuedToEmployee])

  const filteredEmployees = useMemo(() => {
    const active = employees.filter((e) => e.status === 'active')
    const search = employeeSearch.trim().toLowerCase()
    if (!search) return active
    return active.filter((e) => e.fullName.toLowerCase().includes(search))
  }, [employees, employeeSearch])

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (error || !movement || !movementId || !itemId) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Movement unavailable"
          description="That entry may have been removed, or your account can't read this ledger."
        />
      </div>
    )
  }

  const isTransfer = movement.movementType === 'transferOut' || movement.movementType === 'transferIn'
  const parsedQuantity = Number(quantity)
  const canSave =
    !isTransfer &&
    !movement.isVoided &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity > 0 &&
    reason.trim() !== '' &&
    (!item?.hasSizes || sizeVariant !== '') &&
    (!issuedToEmployee || employeeId !== '') &&
    !submitting

  async function handleSave() {
    if (!itemId || !movementId) return
    setSubmitting(true)
    try {
      await inventoryService.updateStockMovement({
        movementId,
        quantity: parsedQuantity,
        sizeVariant: item?.hasSizes ? sizeVariant : null,
        reason: reason.trim(),
        employeeId: issuedToEmployee ? employeeId : null,
      })
      toast.success('Movement updated.')
      navigate(`/hr/inventory/${itemId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update that movement.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVoid() {
    if (!itemId || !movementId) return
    setSubmitting(true)
    try {
      await inventoryService.voidStockMovement({ movementId, reason: voidReason.trim() })
      toast.success('Movement voided and stock reversed.')
      navigate(`/hr/inventory/${itemId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not void that movement.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Correct Movement</h1>
        <p className="text-sm text-muted-foreground">
          {MOVEMENT_TYPE_LABELS[movement.movementType]} · {locationName(movement.outletId)}
          {item ? ` · ${item.name}` : ''}
        </p>
      </div>

      {movement.isVoided && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            This entry is already voided{movement.voidReason ? `: ${movement.voidReason}` : '.'} Its stock effect has
            been reversed and it can no longer be edited.
          </CardContent>
        </Card>
      )}

      {!movement.isVoided && (
        <Card>
          <CardHeader>
            <CardTitle>Correct the entry</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isTransfer ? (
              <p className="text-sm text-muted-foreground">
                A transfer is a paired ledger entry across two locations, so it can't be edited in place. Void it below
                and record a fresh transfer instead.
              </p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {item?.hasSizes && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="size">Size</Label>
                      <Select id="size" value={sizeVariant} onChange={(e) => setSizeVariant(e.target.value)}>
                        <option value="">Select a size…</option>
                        {item.sizes.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                </div>

                {issuedToEmployee && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="employeeSearch">Issued to</Label>
                    <Input
                      id="employeeSearch"
                      placeholder="Search by name…"
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                    />
                    <Select id="employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                      <option value="">Select an employee…</option>
                      {filteredEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.fullName}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    rows={2}
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Unit cost stays as recorded ({movement.unitCost.toLocaleString('id-ID')} IDR) — repricing the item
                  never rewrites past movements.
                </p>

                <div className="flex justify-end">
                  <Button onClick={() => void handleSave()} disabled={!canSave}>
                    Save changes
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!movement.isVoided && (
        <Card>
          <CardHeader>
            <CardTitle>Void this entry</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Reverses this entry's effect on stock on hand and marks it voided. The row stays in the ledger for audit.
              {movement.linkedMovementId ? ' Its paired transfer leg is voided at the same time.' : ''}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="voidReason">Why is it being voided?</Label>
              <Textarea
                id="voidReason"
                rows={2}
                maxLength={500}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button variant="danger" onClick={() => void handleVoid()} disabled={submitting || voidReason.trim() === ''}>
                Void movement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => navigate(`/hr/inventory/${itemId}`)} disabled={submitting}>
          Back to item
        </Button>
      </div>
    </div>
  )
}
