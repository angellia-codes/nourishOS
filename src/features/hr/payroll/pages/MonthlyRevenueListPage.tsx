import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner } from '@/components/ui'
import { EmptyState, ReportTable, type ReportTableColumn } from '@/components/shared'
import { OUTLETS } from '@/constants'
import { formatCurrency } from '@/utils'
import { useToast } from '@/hooks'
import * as revenueService from '../revenueService'
import { ALL_OUTLETS_ID } from '../revenueService'
import type { MonthlyRevenue } from '@/types'

const OUTLET_NAMES: Record<string, string> = {
  ...Object.fromEntries(OUTLETS.map((o) => [o.id, o.name])),
  [ALL_OUTLETS_ID]: 'All Outlets (Total)',
}

const COLUMNS: ReportTableColumn<MonthlyRevenue>[] = [
  { header: 'Outlet', value: (r) => OUTLET_NAMES[r.outletId] ?? r.outletId },
  { header: 'Period', value: (r) => r.periodMonth },
  { header: 'Revenue', value: (r) => formatCurrency(r.amount), align: 'right' },
  { header: 'Updated By', value: (r) => r.updatedBy },
]

/** Manual monthly entry — no POS integration exists to source this automatically. */
export function MonthlyRevenueListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [records, setRecords] = useState<MonthlyRevenue[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [outletId, setOutletId] = useState(OUTLETS[0]?.id ?? '')
  const [periodMonth, setPeriodMonth] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    return revenueService.subscribeToMonthlyRevenue(
      (next) => {
        setDenied(false)
        setRecords(next)
      },
      () => {
        setDenied(true)
        setRecords([])
      },
    )
  }, [])

  async function handleSave() {
    const parsedAmount = Number(amount)
    if (!periodMonth || Number.isNaN(parsedAmount) || parsedAmount < 0) {
      toast.error('Enter a period month and a non-negative amount.')
      return
    }
    setSaving(true)
    try {
      await revenueService.recordMonthlyRevenue({ outletId, periodMonth, amount: parsedAmount })
      toast.success('Revenue recorded.')
      setAmount('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save that revenue figure.')
    } finally {
      setSaving(false)
    }
  }

  if (records === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Access restricted"
          description="Monthly revenue is limited to HR Manager, General Manager, Director and Super Admin."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/hr/payroll')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Monthly Revenue</h1>
          <p className="text-sm text-muted-foreground">One figure per outlet per month, entered by hand.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record revenue</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="outlet">Outlet</Label>
            <Select id="outlet" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
              {OUTLETS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
              <option value={ALL_OUTLETS_ID}>All Outlets (Total)</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="period">Month</Label>
            <Input id="period" type="month" value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Amount (IDR)</Label>
            <Input id="amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <Button disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Spinner className="h-4 w-4" /> : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {records.length === 0 ? (
        <EmptyState title="No revenue recorded yet" />
      ) : (
        <ReportTable columns={COLUMNS} rows={records} rowKey={(r) => `${r.outletId}::${r.periodMonth}`} />
      )}
    </div>
  )
}
