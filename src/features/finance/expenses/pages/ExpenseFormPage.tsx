import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui'
import { useAuth, useToast } from '@/hooks'
import { OUTLETS, DEPARTMENTS, OUTLET_DEPARTMENTS, optionsFor } from '@/constants'
import * as expenseService from '../expenseService'
import {
  EXPENSE_APPROVAL_THRESHOLD_IDR,
  EXPENSE_CATEGORY_LABELS,
  formatIdr,
} from '../expenseFormat'
import type { ExpenseCategory, ExpenseItem } from '@/types'

/** The date input's ceiling — an expense cannot be dated in the future (§4). */
const TODAY = new Date().toISOString().slice(0, 10)

interface DraftItem {
  description: string
  /** Kept as a string so the field can be empty while typing. */
  amount: string
}

const EMPTY_ITEM: DraftItem = { description: '', amount: '' }

/**
 * expense-request.md §4 — create and edit, drafts only. The total shown here is
 * a preview: the server recomputes it from the items on submit, which is what
 * makes it the number that decides the approval chain (§3).
 *
 * Receipts are not on this page: createFileMetadata needs an existing
 * resourceId, so the flow is save the draft → attach on the detail page →
 * submit.
 */
export function ExpenseFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuth()
  const { expenseRequestId } = useParams<{ expenseRequestId: string }>()
  const isEdit = Boolean(expenseRequestId)

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [outletId, setOutletId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [purpose, setPurpose] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('other')
  const [expenseDate, setExpenseDate] = useState(TODAY)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<DraftItem[]>([{ ...EMPTY_ITEM }])

  useEffect(() => {
    if (isEdit) return
    if (profile?.outletId) setOutletId((prev) => prev || profile.outletId)
    if (profile?.departmentId) setDepartmentId((prev) => prev || profile.departmentId)
  }, [isEdit, profile?.outletId, profile?.departmentId])

  const departmentOptions = useMemo(() => optionsFor(OUTLET_DEPARTMENTS[outletId] ?? [], DEPARTMENTS), [outletId])

  useEffect(() => {
    if (!expenseRequestId) return
    let cancelled = false

    void expenseService
      .getExpenseRequest(expenseRequestId)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          toast.error('That expense request no longer exists.')
          navigate('/finance')
          return
        }
        if (row.status !== 'draft') {
          toast.error('Only a draft can be edited.')
          navigate(`/finance/expenses/${expenseRequestId}`)
          return
        }
        setOutletId(row.outletId ?? '')
        setDepartmentId(row.departmentId ?? '')
        setPurpose(row.purpose)
        setCategory(row.category)
        setExpenseDate(row.expenseDate)
        setNotes(row.notes ?? '')
        setItems(
          row.items.length > 0
            ? row.items.map((item) => ({ description: item.description, amount: String(item.amount) }))
            : [{ ...EMPTY_ITEM }],
        )
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load that expense request.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [expenseRequestId, navigate, toast])

  const parsedItems = useMemo<ExpenseItem[]>(
    () =>
      items
        .map((item) => ({ description: item.description.trim(), amount: Math.round(Number(item.amount)) }))
        .filter((item) => item.description !== '' && Number.isFinite(item.amount) && item.amount > 0),
    [items],
  )

  const total = parsedItems.reduce((sum, item) => sum + item.amount, 0)
  const canSubmit =
    outletId !== '' &&
    departmentId !== '' &&
    purpose.trim() !== '' &&
    parsedItems.length > 0 &&
    expenseDate !== '' &&
    !submitting

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  async function handleSave() {
    setSubmitting(true)
    try {
      const input = {
        outletId,
        departmentId,
        purpose: purpose.trim(),
        category,
        expenseDate,
        notes: notes.trim() || undefined,
        items: parsedItems,
      }

      if (expenseRequestId) {
        await expenseService.updateExpenseRequest({ ...input, expenseRequestId })
        toast.success('Draft updated.')
        navigate(`/finance/expenses/${expenseRequestId}`)
        return
      }

      const { expenseRequestId: newId } = await expenseService.createExpenseRequest(input)
      toast.success('Draft saved. Attach a receipt, then submit.')
      navigate(`/finance/expenses/${newId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the expense request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">{isEdit ? 'Edit Expense Request' : 'New Expense Request'}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Request details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="outletId">Outlet</Label>
              <Select
                id="outletId"
                value={outletId}
                onChange={(e) => {
                  setOutletId(e.target.value)
                  setDepartmentId('')
                }}
              >
                <option value="">Select an outlet…</option>
                {OUTLETS.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="departmentId">Department</Label>
              <Select id="departmentId" value={departmentId} disabled={outletId === ''} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">{outletId === '' ? 'Select an outlet first' : 'Select a department…'}</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purpose">Purpose / justification</Label>
            <Textarea id="purpose" rows={4} value={purpose} maxLength={2000} onChange={(e) => setPurpose(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <Select id="category" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expenseDate">Expense date</Label>
              <Input
                id="expenseDate"
                type="date"
                max={TODAY}
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              maxLength={1000}
              placeholder="Anything an approver should know that isn't the justification itself."
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {items.map((item, index) => (
            <div key={index} className="flex flex-wrap items-end gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Label htmlFor={`item-${index}-description`}>Description</Label>
                <Input
                  id={`item-${index}-description`}
                  value={item.description}
                  maxLength={200}
                  onChange={(e) => updateItem(index, { description: e.target.value })}
                />
              </div>
              <div className="flex w-40 flex-col gap-1.5">
                <Label htmlFor={`item-${index}-amount`}>Amount (IDR)</Label>
                <Input
                  id={`item-${index}-amount`}
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={item.amount}
                  onChange={(e) => updateItem(index, { amount: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove item ${index + 1}`}
                disabled={items.length === 1}
                onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => setItems((current) => [...current, { ...EMPTY_ITEM }])}
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Add item
          </Button>

          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">
              Total is recomputed on the server when you submit.
            </span>
            <span className="font-mono text-lg font-semibold tabular-nums text-foreground">{formatIdr(total)}</span>
          </div>

          {total > EXPENSE_APPROVAL_THRESHOLD_IDR && (
            <p className="text-xs text-muted-foreground">
              Above {formatIdr(EXPENSE_APPROVAL_THRESHOLD_IDR)}, this also needs the General Manager and the Director.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleSave()} disabled={!canSubmit}>
          {isEdit ? 'Save changes' : 'Save draft'}
        </Button>
      </div>
    </div>
  )
}
