import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Plus, Trash2, Upload } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from '@/components/ui'
import { useToast } from '@/hooks'
import { FINANCE_DEPARTMENTS, FINANCE_OUTLETS, computeExpenseApprovalChain, type ExpenseCategory } from './financeDemoData'
import { EXPENSE_CATEGORY_LABELS, formatIdr } from './financeFormat'

interface DraftItem {
  id: string
  description: string
  category: ExpenseCategory
  amount: string
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

const CATEGORY_OPTIONS = Object.entries(EXPENSE_CATEGORY_LABELS) as [ExpenseCategory, string][]

/**
 * Read-only-except-for-the-form visual preview of the Expense Request
 * submission form — finance.md §5, §19 validation rules. Mock data, no
 * Firestore/Cloud Function calls.
 */
export function ExpenseRequestFormDemoPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [outletId, setOutletId] = useState(FINANCE_OUTLETS[0].id)
  const [departmentId, setDepartmentId] = useState(FINANCE_DEPARTMENTS[0].id)
  const [costCenter, setCostCenter] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [items, setItems] = useState<DraftItem[]>([{ id: newId('item'), description: '', category: 'other', amount: '' }])
  const [hasReceipt, setHasReceipt] = useState(false)

  const total = useMemo(() => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [items])
  const approvalChain = useMemo(() => computeExpenseApprovalChain(total), [total])

  const today = new Date().toISOString().slice(0, 10)
  const isValid =
    costCenter.trim().length > 0 &&
    expenseDate !== '' &&
    expenseDate <= today &&
    items.length > 0 &&
    items.every((item) => item.description.trim().length > 0 && Number(item.amount) > 0) &&
    hasReceipt

  function updateItem(id: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function handleSubmit() {
    if (!isValid) return
    toast.success('Expense request submitted (demo) — request number is generated server-side in the real flow; nothing was written to a backend.')
    navigate('/demo/finance')
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Submitting shows a toast and returns to the list; nothing is persisted.
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/finance')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">New Expense Request</h1>
            <p className="text-sm text-muted-foreground">Draft → Submitted → Manager → Finance → GM (→ Director)</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="outlet">Outlet *</Label>
                <Select id="outlet" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
                  {FINANCE_OUTLETS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="department">Department *</Label>
                <Select id="department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  {FINANCE_DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="costCenter">Cost Center *</Label>
                <Input id="costCenter" placeholder="CC-SNR-FNB" value={costCenter} onChange={(e) => setCostCenter(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expenseDate">Expense Date *</Label>
                <Input id="expenseDate" type="date" max={today} value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* finance.md §19 — total amount must equal sum of items */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Expense Items</CardTitle>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setItems((prev) => [...prev, { id: newId('item'), description: '', category: 'other', amount: '' }])}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor={`desc-${item.id}`}>Description *</Label>
                  <Input
                    id={`desc-${item.id}`}
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:w-44">
                  <Label htmlFor={`cat-${item.id}`}>Category *</Label>
                  <Select
                    id={`cat-${item.id}`}
                    value={item.category}
                    onChange={(e) => updateItem(item.id, { category: e.target.value as ExpenseCategory })}
                  >
                    {CATEGORY_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5 sm:w-36">
                  <Label htmlFor={`amt-${item.id}`}>Amount (IDR) *</Label>
                  <Input
                    id={`amt-${item.id}`}
                    type="number"
                    min={0}
                    value={item.amount}
                    onChange={(e) => updateItem(item.id, { amount: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
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

            <div className="rounded-md border border-border bg-background p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Approval chain for this request</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {approvalChain.map((role, i) => (
                  <span key={role} className="flex items-center gap-1.5">
                    <Badge variant="neutral">{role}</Badge>
                    {i < approvalChain.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* finance.md §19 — receipt attachment mandatory */}
        <Card>
          <CardHeader>
            <CardTitle>Receipt *</CardTitle>
          </CardHeader>
          <CardContent>
            {hasReceipt ? (
              <div className="flex items-center gap-3 rounded-md border border-border p-2 text-sm">
                <span className="flex-1 truncate text-foreground">receipt.pdf</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setHasReceipt(false)}>
                  Remove
                </Button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setHasReceipt(true)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setHasReceipt(true)}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors duration-150 hover:border-primary/50"
              >
                <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-primary">Click to add a demo receipt</span>
                </p>
                <p className="text-xs text-muted-foreground">Required — finance.md §19</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/demo/finance')}>
            Cancel
          </Button>
          <Button type="button" disabled={!isValid} onClick={handleSubmit}>
            Submit Expense Request
          </Button>
        </div>
      </div>
    </div>
  )
}
