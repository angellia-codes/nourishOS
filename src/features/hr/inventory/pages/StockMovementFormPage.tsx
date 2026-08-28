import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { DEPARTMENTS, OUTLETS } from '@/constants'
import { useToast } from '@/hooks'
import { subscribeToEmployees } from '@/features/hr/services/employeeService'
import * as inventoryService from '../inventoryService'
import { HR_STORE_ID, HR_STORE_NAME } from '../inventoryFormat'
import type { Employee, InventoryItem, StockLevel } from '@/types'

type DestinationType = 'outlet' | 'department'

type Mode = 'receive' | 'issue' | 'transfer'

const RECEIVE_REASONS = [
  { value: 'supplierReceipt', label: 'Supplier receipt' },
  { value: 'employeeReturn', label: 'Employee return' },
  { value: 'adjustment', label: 'Adjustment' },
] as const

const ISSUE_REASONS = [
  { value: 'employeeIssue', label: 'Issued to employee' },
  { value: 'writeOff', label: 'Write-off' },
  { value: 'adjustment', label: 'Adjustment' },
] as const

const TITLE: Record<Mode, string> = {
  receive: 'Receive Stock',
  issue: 'Issue Stock',
  transfer: 'Transfer Stock',
}

/**
 * One component, three modes read off the URL — receive/issue/transfer share
 * almost identical fields (outlet, size, quantity, reason), so a single form
 * avoids near-duplicating three near-identical page files.
 */
export function StockMovementFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { itemId } = useParams<{ itemId: string }>()
  const location = useLocation()
  const mode: Mode = location.pathname.endsWith('/issue')
    ? 'issue'
    : location.pathname.endsWith('/transfer')
      ? 'transfer'
      : 'receive'

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [levels, setLevels] = useState<StockLevel[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  const [destinationType, setDestinationType] = useState<DestinationType>('outlet')
  const [destinationId, setDestinationId] = useState(OUTLETS[0]?.id ?? '')
  const [sizeVariant, setSizeVariant] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reasonCode, setReasonCode] = useState<string>(mode === 'issue' ? 'employeeIssue' : 'supplierReceipt')
  const [employeeId, setEmployeeId] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!itemId) return
    let cancelled = false
    void inventoryService
      .getInventoryItem(itemId)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          toast.error('That item no longer exists.')
          navigate('/hr/inventory')
          return
        }
        setItem(row)
        if (row.hasSizes && row.sizes.length > 0) setSizeVariant(row.sizes[0])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [itemId, navigate, toast])

  useEffect(() => {
    if (!itemId) return
    return inventoryService.subscribeToStockLevels(itemId, setLevels)
  }, [itemId])

  useEffect(() => {
    if (mode !== 'issue') return
    return subscribeToEmployees(setEmployees)
  }, [mode])

  const activeEmployees = useMemo(() => employees.filter((e) => e.status === 'active'), [employees])
  const filteredEmployees = useMemo(() => {
    const search = employeeSearch.trim().toLowerCase()
    if (!search) return activeEmployees
    return activeEmployees.filter((e) => e.fullName.toLowerCase().includes(search))
  }, [activeEmployees, employeeSearch])

  const onHandAt = (outlet: string) => {
    const size = item?.hasSizes ? sizeVariant : null
    return levels.find((l) => l.outletId === outlet && (l.sizeVariant ?? null) === size)?.quantityOnHand ?? 0
  }

  const parsedQuantity = Number(quantity)
  const isAdjustmentLike = mode === 'receive' ? reasonCode === 'adjustment' : mode === 'issue' && reasonCode !== 'employeeIssue'
  const notesOk = !isAdjustmentLike || notes.trim() !== ''
  const employeeOk = mode !== 'issue' || reasonCode !== 'employeeIssue' || employeeId !== ''
  const destinationOk = mode !== 'transfer' || destinationId !== ''
  const sizeOk = !item?.hasSizes || sizeVariant !== ''
  const quantityOk =
    mode === 'receive' || Number.isInteger(parsedQuantity) === false || parsedQuantity <= onHandAt(HR_STORE_ID)
  const canSubmit =
    Number.isInteger(parsedQuantity) &&
    parsedQuantity > 0 &&
    notesOk &&
    employeeOk &&
    destinationOk &&
    sizeOk &&
    quantityOk &&
    !submitting

  async function handleSubmit() {
    if (!itemId) return
    setSubmitting(true)
    try {
      const size = item?.hasSizes ? sizeVariant : undefined
      if (mode === 'receive') {
        await inventoryService.receiveStock({
          itemId,
          sizeVariant: size,
          quantity: parsedQuantity,
          reasonCode: reasonCode as 'supplierReceipt' | 'employeeReturn' | 'adjustment',
          notes: notes.trim() || undefined,
        })
      } else if (mode === 'issue') {
        await inventoryService.issueStock({
          itemId,
          sizeVariant: size,
          quantity: parsedQuantity,
          reasonCode: reasonCode as 'employeeIssue' | 'writeOff' | 'adjustment',
          employeeId: reasonCode === 'employeeIssue' ? employeeId : undefined,
          notes: notes.trim() || undefined,
        })
      } else {
        await inventoryService.transferStock({
          itemId,
          destinationType,
          destinationId,
          sizeVariant: size,
          quantity: parsedQuantity,
          notes: notes.trim() || undefined,
        })
      }
      toast.success('Movement recorded.')
      navigate(`/hr/inventory/${itemId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not record that movement.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !item) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const reasons = mode === 'receive' ? RECEIVE_REASONS : ISSUE_REASONS

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">{TITLE[mode]}</h1>
      <p className="-mt-3 text-sm text-muted-foreground">{item.name}</p>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>{mode === 'transfer' ? 'From' : 'Location'}</Label>
              <p className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-foreground">
                {HR_STORE_NAME}
              </p>
              <p className="text-xs text-muted-foreground">{onHandAt(HR_STORE_ID)} currently on hand.</p>
            </div>

            {mode === 'transfer' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="destinationType">Transfer to</Label>
                  <Select
                    id="destinationType"
                    value={destinationType}
                    onChange={(e) => {
                      const nextType = e.target.value as DestinationType
                      setDestinationType(nextType)
                      setDestinationId((nextType === 'outlet' ? OUTLETS[0]?.id : DEPARTMENTS[0]?.id) ?? '')
                    }}
                  >
                    <option value="outlet">Outlet</option>
                    <option value="department">Department</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="destinationId">{destinationType === 'outlet' ? 'Outlet' : 'Department'}</Label>
                  <Select id="destinationId" value={destinationId} onChange={(e) => setDestinationId(e.target.value)}>
                    {(destinationType === 'outlet' ? OUTLETS : DEPARTMENTS).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            )}

            {item.hasSizes && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="size">Size</Label>
                <Select id="size" value={sizeVariant} onChange={(e) => setSizeVariant(e.target.value)}>
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
              {mode !== 'receive' && !quantityOk && (
                <p className="text-xs text-destructive">Only {onHandAt(HR_STORE_ID)} on hand at HR Store.</p>
              )}
            </div>
          </div>

          {mode !== 'transfer' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Select id="reason" value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
                {reasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {mode === 'issue' && reasonCode === 'employeeIssue' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employeeSearch">Employee</Label>
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
            <Label htmlFor="notes">Notes {isAdjustmentLike ? '' : '(optional)'}</Label>
            <Textarea id="notes" rows={3} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={!canSubmit}>
          {TITLE[mode]}
        </Button>
      </div>
    </div>
  )
}
