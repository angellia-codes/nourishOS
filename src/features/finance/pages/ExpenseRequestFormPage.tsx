import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import { fileService } from '@/services/shared'
import type { ExpenseCategory } from '@/types'
import * as expenseService from '../expenseService'
import { EXPENSE_CATEGORY_LABELS, formatIdr } from '../financeFormat'

interface DraftItem {
  id: string
  description: string
  category: ExpenseCategory
  amount: string
}

const CATEGORY_OPTIONS = Object.entries(EXPENSE_CATEGORY_LABELS) as [ExpenseCategory, string][]
const TODAY = new Date().toISOString().slice(0, 10)

function newId(): string {
  return `item-${crypto.randomUUID().slice(0, 8)}`
}

/**
 * New Expense Request — expense-request.md §4. Outlet/department are auto-filled
 * server-side from the caller's profile, so they aren't on the form. One-shot:
 * create draft → attach the receipt to the new id → submit for approval.
 */
export function ExpenseRequestFormPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [purpose, setPurpose] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('other')
  const [costCenter, setCostCenter] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [items, setItems] = useState<DraftItem[]>([{ id: newId(), description: '', category: 'other', amount: '' }])
  const [receipt, setReceipt] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const total = useMemo(() => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [items])

  const isValid =
    purpose.trim() !== '' &&
    expenseDate !== '' &&
    expenseDate <= TODAY &&
    items.every((item) => item.description.trim() !== '' && Number(item.amount) > 0) &&
    receipt !== null

  function updateItem(id: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  async function handleSubmit() {
    if (!isValid || !receipt) return
    setSubmitting(true)
    try {
      const { expenseRequestId, requestNumber } = await expenseService.createExpenseRequest({
        purpose,
        category,
        costCenterId: costCenter.trim() || undefined,
        expenseDate,
        items: items.map((item) => ({ description: item.description, amount: Number(item.amount), category: item.category })),
      })

      // Create-then-attach — the request needs a server-generated id before the
      // receipt file can reference it (same order as Lost & Found's photo).
      await fileService.uploadFile({ file: receipt, module: 'finance', resourceType: 'expenseRequest', resourceId: expenseRequestId })

      await expenseService.submitExpenseRequest(expenseRequestId)

      toast.success(`${requestNumber} submitted for approval.`)
      navigate('/finance')
    } catch {
      toast.error('Failed to submit expense request. A draft may have been saved — check the list.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/finance')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">New Expense Request</h1>
          <p className="text-sm text-muted-foreground">≤ IDR 5,000,000 routes Manager → Finance; above adds GM → Director.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purpose">Purpose / Justification *</Label>
            <Textarea id="purpose" className="min-h-[70px]" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category *</Label>
              <Select id="category" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
                {CATEGORY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="costCenter">Cost Center</Label>
              <Input id="costCenter" placeholder="Optional" value={costCenter} onChange={(e) => setCostCenter(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expenseDate">Expense Date *</Label>
              <Input id="expenseDate" type="date" max={TODAY} value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Expense Items</CardTitle>
          <Button type="button" variant="secondary" size="sm" onClick={() => setItems((prev) => [...prev, { id: newId(), description: '', category: 'other', amount: '' }])}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={`desc-${item.id}`}>Description *</Label>
                <Input id={`desc-${item.id}`} value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5 sm:w-40">
                <Label htmlFor={`cat-${item.id}`}>Category</Label>
                <Select id={`cat-${item.id}`} value={item.category} onChange={(e) => updateItem(item.id, { category: e.target.value as ExpenseCategory })}>
                  {CATEGORY_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 sm:w-36">
                <Label htmlFor={`amt-${item.id}`}>Amount (IDR) *</Label>
                <Input id={`amt-${item.id}`} type="number" min={0} value={item.amount} onChange={(e) => updateItem(item.id, { amount: e.target.value })} />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                disabled={items.length === 1}
                onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                aria-label="Remove item"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-medium text-foreground">
            <span>Total</span>
            <span>{formatIdr(total)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipt *</CardTitle>
        </CardHeader>
        <CardContent>
          <label
            htmlFor="receipt"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors duration-150 hover:border-primary/50"
          >
            <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {receipt ? `${receipt.name} selected` : (
                <>
                  <span className="font-medium text-primary">Add a receipt *</span> — mandatory before submitting
                </>
              )}
            </p>
            <input id="receipt" type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate('/finance')} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" disabled={!isValid || submitting} onClick={handleSubmit}>
          {submitting ? <Spinner className="h-4 w-4" /> : 'Submit Expense Request'}
        </Button>
      </div>
    </div>
  )
}
