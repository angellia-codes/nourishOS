import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, Circle, Plus, Trash2 } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useAuth, useToast } from '@/hooks'
import { OUTLETS, checklistItemsFor } from '@/constants'
import * as shiftReportService from '../shiftReportService'
import {
  REPORT_TYPE_LABELS,
  UNAVAILABLE_CATEGORY_LABELS,
  flaggedIssues,
  formatReportDate,
  outletName,
} from '../shiftReportFormat'
import type {
  DeptStaffing,
  LimitedItem,
  ShiftReport,
  ShiftReportIssue,
  ShiftReportType,
  UnavailableCategory,
} from '@/types'

/** Same client-side "today" convention the rest of Operations uses — a lookup key, not a server-truth boundary. */
function todayIsoClient(): string {
  return new Date().toISOString().slice(0, 10)
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

const BLANK_ISSUE: ShiftReportIssue = { present: false, details: '' }
const BLANK_STAFFING: DeptStaffing = { pic: '', regularStaff: 0, dailyWorker: 0, midShift: 0 }

type UnavailableRow = { id: string; category: UnavailableCategory; product: string; reason: string; actionRequired: string }
type LimitedRow = { id: string } & LimitedItem

/** §4/§5/§6's "- [ ] None / - [ ] Yes — Details:" pairs. Nine of these on the form. */
function IssueField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: ShiftReportIssue
  onChange: (next: ShiftReportIssue) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="checkbox"
          className="h-5 w-5 shrink-0 rounded-sm border border-border accent-primary"
          checked={value.present}
          onChange={(e) => onChange({ present: e.target.checked, details: e.target.checked ? value.details : '' })}
        />
        <Label htmlFor={id}>{label}</Label>
      </div>
      {value.present && (
        <Textarea
          aria-label={`${label} details`}
          placeholder="Details…"
          value={value.details}
          onChange={(e) => onChange({ present: true, details: e.target.value })}
        />
      )}
    </div>
  )
}

/** §5 — one block per department. Mid-shift is asked for on the closing report only. */
function StaffingBlock({
  title,
  idPrefix,
  value,
  showMidShift,
  onChange,
}: {
  title: string
  idPrefix: string
  value: DeptStaffing
  showMidShift: boolean
  onChange: (next: DeptStaffing) => void
}) {
  const numberField = (key: 'regularStaff' | 'dailyWorker' | 'midShift', label: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${idPrefix}-${key}`}>{label}</Label>
      <Input
        id={`${idPrefix}-${key}`}
        type="number"
        min={0}
        value={value[key] === 0 ? '' : String(value[key])}
        onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) || 0 })}
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-pic`}>PIC / IC</Label>
          <Input id={`${idPrefix}-pic`} value={value.pic} onChange={(e) => onChange({ ...value, pic: e.target.value })} />
        </div>
        {numberField('regularStaff', 'Regular staff')}
        {numberField('dailyWorker', 'Daily worker')}
        {showMidShift && numberField('midShift', 'Mid shift')}
      </div>
    </div>
  )
}

/**
 * opening_closing_shift_report_template.md — one component serves both report
 * types off the `:type` route param, the same precedent the retired
 * ChecklistPage set. §7's checklist is a section of this form now, so the
 * standalone Opening/Closing Checklist pages are gone.
 */
export function ShiftReportFormPage() {
  const { type } = useParams<{ type: ShiftReportType }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const toast = useToast()

  const isClosing = type === 'closing'
  const date = todayIsoClient()

  const [outletId, setOutletId] = useState('')
  const [shift, setShift] = useState('')

  const [foodPromo, setFoodPromo] = useState('')
  const [beveragePromo, setBeveragePromo] = useState('')
  const [specialMenu, setSpecialMenu] = useState('')

  const [unavailableRows, setUnavailableRows] = useState<UnavailableRow[]>([])
  const [limitedRows, setLimitedRows] = useState<LimitedRow[]>([])

  const [reviewRating, setReviewRating] = useState('')
  const [reviewCount, setReviewCount] = useState('')
  const [reviewKeyFeedback, setReviewKeyFeedback] = useState('')

  const [managerIc, setManagerIc] = useState('')
  const [supervisorIc, setSupervisorIc] = useState('')
  const [staffing, setStaffing] = useState<Record<'floor' | 'bar' | 'kitchen', DeptStaffing>>({
    floor: BLANK_STAFFING,
    bar: BLANK_STAFFING,
    kitchen: BLANK_STAFFING,
  })
  const [steward, setSteward] = useState('')
  const [cashier, setCashier] = useState('')
  const [otherPositions, setOtherPositions] = useState('')

  // The nine §4/§5/§6 checkbox+details pairs share one record rather than
  // eighteen useState calls — same shape the server stores.
  const [issues, setIssues] = useState<Record<string, ShiftReportIssue>>({})
  const issueOf = (key: string) => issues[key] ?? BLANK_ISSUE
  const setIssue = (key: string) => (next: ShiftReportIssue) => setIssues((prev) => ({ ...prev, [key]: next }))

  const [otherNotes, setOtherNotes] = useState('')
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [priorities, setPriorities] = useState<string[]>(['', '', ''])
  const [followUpRequired, setFollowUpRequired] = useState('')
  const [picAcknowledgement, setPicAcknowledgement] = useState('')

  const [openingReport, setOpeningReport] = useState<ShiftReport | null | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)

  const checklistItems = useMemo(() => checklistItemsFor(isClosing ? 'closing' : 'opening'), [isClosing])

  useEffect(() => {
    if (profile?.outletId) setOutletId((prev) => prev || profile.outletId!)
  }, [profile?.outletId])

  // §8 carry-forward: the closing report shows what the morning's opening
  // report left open, read-only, so nothing gets dropped between shifts.
  useEffect(() => {
    if (!isClosing || !outletId) {
      setOpeningReport(null)
      return
    }
    let cancelled = false
    shiftReportService.getShiftReport(outletId, date, 'opening').then((report) => {
      if (!cancelled) setOpeningReport(report)
    })
    return () => {
      cancelled = true
    }
  }, [isClosing, outletId, date])

  if (type !== 'opening' && type !== 'closing') {
    return <EmptyState title="Unknown report type" description="Open a shift report from the Shift Reports page." />
  }

  const canSubmit = outletId !== '' && shift.trim() !== '' && !submitting

  async function handleSubmit() {
    if (!canSubmit || (type !== 'opening' && type !== 'closing')) return
    setSubmitting(true)
    try {
      const { reportId } = await shiftReportService.submitShiftReport({
        reportType: type,
        shift: shift.trim(),
        outletId,
        foodPromo,
        beveragePromo,
        specialMenu,
        unavailableItems: unavailableRows.map(({ id: _id, ...row }) => row),
        limitedItems: limitedRows.map(({ id: _id, ...row }) => row),
        complaints: issueOf('complaints'),
        customerFeedback: issueOf('customerFeedback'),
        reviewRating: reviewRating === '' ? null : Number(reviewRating),
        reviewCount: reviewCount === '' ? null : Number(reviewCount),
        reviewKeyFeedback,
        managerIc,
        supervisorIc,
        floor: staffing.floor,
        bar: staffing.bar,
        kitchen: staffing.kitchen,
        steward: Number(steward) || 0,
        cashier,
        otherPositions,
        absent: issueOf('absent'),
        sickLeave: issueOf('sickLeave'),
        permission: issueOf('permission'),
        maintenance: issueOf('maintenance'),
        equipment: issueOf('equipment'),
        hygiene: issueOf('hygiene'),
        stock: issueOf('stock'),
        otherNotes,
        checklistStatuses: checklist,
        priorities: priorities.map((p) => p.trim()).filter((p) => p !== ''),
        followUpRequired,
        picAcknowledgement,
      })
      toast.success('Shift report submitted.')
      navigate(`/operations/shift-reports/${reportId}`)
    } catch {
      toast.error('Failed to submit. A report for this outlet and shift type may already exist today.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/operations/shift-reports')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">New {REPORT_TYPE_LABELS[type]} Report</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.displayName} &middot; {formatReportDate(date)}
          </p>
        </div>
      </div>

      {/* §8 — what the opening shift left open. Read-only; the manager restates anything still outstanding below. */}
      {isClosing && openingReport && (
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle>Carried over from this morning</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {openingReport.unavailableItems.length > 0 && (
              <div>
                <p className="font-medium text-foreground">Unavailable products</p>
                <ul className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
                  {openingReport.unavailableItems.map((item, i) => (
                    <li key={i}>
                      {UNAVAILABLE_CATEGORY_LABELS[item.category]} &middot; {item.product}
                      {item.actionRequired && ` — ${item.actionRequired}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {flaggedIssues(openingReport).length > 0 && (
              <div>
                <p className="font-medium text-foreground">Issues flagged</p>
                <ul className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
                  {flaggedIssues(openingReport).map((issue) => (
                    <li key={issue.label} className="flex items-start gap-1.5">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
                      <span>
                        {issue.label}
                        {issue.details && ` — ${issue.details}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {openingReport.priorities.length > 0 && (
              <div>
                <p className="font-medium text-foreground">Priorities set for this shift</p>
                <ol className="mt-1 flex list-inside list-decimal flex-col gap-0.5 text-muted-foreground">
                  {openingReport.priorities.map((priority, i) => (
                    <li key={i}>{priority}</li>
                  ))}
                </ol>
              </div>
            )}
            {openingReport.unavailableItems.length === 0 &&
              flaggedIssues(openingReport).length === 0 &&
              openingReport.priorities.length === 0 && (
                <p className="text-muted-foreground">The opening report flagged nothing.</p>
              )}
          </CardContent>
        </Card>
      )}
      {isClosing && openingReport === null && (
        <p className="text-sm text-muted-foreground">
          No opening report was filed for {outletId ? outletName(outletId) : 'this outlet'} today.
        </p>
      )}

      {/* §1 Report Information */}
      <Card>
        <CardHeader>
          <CardTitle>Report Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="srOutlet">Outlet *</Label>
            <Select id="srOutlet" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
              <option value="">Select an outlet…</option>
              {OUTLETS.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="srShift">Shift *</Label>
            <Input id="srShift" placeholder="Morning / Mid / Night" value={shift} onChange={(e) => setShift(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* §2 Sales & Promotion */}
      <Card>
        <CardHeader>
          <CardTitle>Sales &amp; Promotion</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="srFoodPromo">Food promo</Label>
            <Textarea id="srFoodPromo" value={foodPromo} onChange={(e) => setFoodPromo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="srBeveragePromo">Beverage promo</Label>
            <Textarea id="srBeveragePromo" value={beveragePromo} onChange={(e) => setBeveragePromo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="srSpecialMenu">Special menu</Label>
            <Textarea id="srSpecialMenu" value={specialMenu} onChange={(e) => setSpecialMenu(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* §3 Product Availability — the template's three N/A tables collapse into one categorised list. */}
      <Card>
        <CardHeader>
          <CardTitle>Product Availability</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Not available</p>
            {unavailableRows.map((row) => (
              <div key={row.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex items-start gap-2">
                  <Select
                    aria-label="Category"
                    value={row.category}
                    onChange={(e) =>
                      setUnavailableRows((rows) =>
                        rows.map((r) => (r.id === row.id ? { ...r, category: e.target.value as UnavailableCategory } : r)),
                      )
                    }
                  >
                    {Object.entries(UNAVAILABLE_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove product"
                    onClick={() => setUnavailableRows((rows) => rows.filter((r) => r.id !== row.id))}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <Input
                  aria-label="Product"
                  placeholder="Product"
                  value={row.product}
                  onChange={(e) =>
                    setUnavailableRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, product: e.target.value } : r)))
                  }
                />
                <Input
                  aria-label="Reason / status"
                  placeholder="Reason / status"
                  value={row.reason}
                  onChange={(e) =>
                    setUnavailableRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, reason: e.target.value } : r)))
                  }
                />
                <Input
                  aria-label="Action required"
                  placeholder={isClosing ? 'Action required for next shift' : 'Action required'}
                  value={row.actionRequired}
                  onChange={(e) =>
                    setUnavailableRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, actionRequired: e.target.value } : r)))
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() =>
                setUnavailableRows((rows) => [
                  ...rows,
                  { id: newId('na'), category: 'food', product: '', reason: '', actionRequired: '' },
                ])
              }
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Add product
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Limited availability</p>
            {limitedRows.map((row) => (
              <div key={row.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex items-start gap-2">
                  <Input
                    aria-label="Product"
                    placeholder="Product"
                    value={row.product}
                    onChange={(e) =>
                      setLimitedRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, product: e.target.value } : r)))
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove product"
                    onClick={() => setLimitedRows((rows) => rows.filter((r) => r.id !== row.id))}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <Input
                  aria-label="Remaining quantity"
                  type="number"
                  min={0}
                  placeholder="Remaining qty"
                  value={row.remainingQty === 0 ? '' : String(row.remainingQty)}
                  onChange={(e) =>
                    setLimitedRows((rows) =>
                      rows.map((r) => (r.id === row.id ? { ...r, remainingQty: Number(e.target.value) || 0 } : r)),
                    )
                  }
                />
                <Input
                  aria-label="Action required"
                  placeholder={isClosing ? 'Action required for next shift' : 'Action required'}
                  value={row.actionRequired}
                  onChange={(e) =>
                    setLimitedRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, actionRequired: e.target.value } : r)))
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => setLimitedRows((rows) => [...rows, { id: newId('lim'), product: '', remainingQty: 0, actionRequired: '' }])}
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Add product
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* §4 Customer Feedback / Experience */}
      <Card>
        <CardHeader>
          <CardTitle>{isClosing ? 'Customer Experience' : 'Customer Feedback'}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <IssueField id="srComplaints" label="Complaints" value={issueOf('complaints')} onChange={setIssue('complaints')} />
          <IssueField
            id="srCustomerFeedback"
            label="Customer feedback"
            value={issueOf('customerFeedback')}
            onChange={setIssue('customerFeedback')}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="srRating">Online review rating</Label>
              <Input
                id="srRating"
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={reviewRating}
                onChange={(e) => setReviewRating(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="srReviewCount">No. of reviews</Label>
              <Input id="srReviewCount" type="number" min={0} value={reviewCount} onChange={(e) => setReviewCount(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="srReviewFeedback">Key feedback / mention</Label>
            <Textarea id="srReviewFeedback" value={reviewKeyFeedback} onChange={(e) => setReviewKeyFeedback(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* §5 Staffing & Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Staffing &amp; Attendance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isClosing && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="srManagerIc">Manager IC</Label>
                <Input id="srManagerIc" value={managerIc} onChange={(e) => setManagerIc(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="srSupervisorIc">Supervisor IC</Label>
                <Input id="srSupervisorIc" value={supervisorIc} onChange={(e) => setSupervisorIc(e.target.value)} />
              </div>
            </div>
          )}

          {(['floor', 'bar', 'kitchen'] as const).map((dept) => (
            <StaffingBlock
              key={dept}
              title={dept === 'floor' ? 'Floor' : dept === 'bar' ? 'Bar' : 'Kitchen'}
              idPrefix={`sr-${dept}`}
              value={staffing[dept]}
              showMidShift={isClosing}
              onChange={(next) => setStaffing((prev) => ({ ...prev, [dept]: next }))}
            />
          ))}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="srSteward">Steward</Label>
              <Input id="srSteward" type="number" min={0} value={steward} onChange={(e) => setSteward(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="srCashier">Cashier</Label>
              <Input id="srCashier" value={cashier} onChange={(e) => setCashier(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="srOtherPositions">Other positions</Label>
            <Input id="srOtherPositions" value={otherPositions} onChange={(e) => setOtherPositions(e.target.value)} />
          </div>

          <IssueField id="srAbsent" label="Absent" value={issueOf('absent')} onChange={setIssue('absent')} />
          <IssueField id="srSickLeave" label="Sick leave" value={issueOf('sickLeave')} onChange={setIssue('sickLeave')} />
          <IssueField id="srPermission" label="Permission" value={issueOf('permission')} onChange={setIssue('permission')} />
        </CardContent>
      </Card>

      {/* §6 Operational & Maintenance Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Operational Issues</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <IssueField id="srMaintenance" label="Maintenance" value={issueOf('maintenance')} onChange={setIssue('maintenance')} />
          <IssueField id="srEquipment" label="Equipment / facility" value={issueOf('equipment')} onChange={setIssue('equipment')} />
          {isClosing && (
            <>
              <IssueField id="srHygiene" label="Cleaning / hygiene" value={issueOf('hygiene')} onChange={setIssue('hygiene')} />
              <IssueField id="srStock" label="Stock / inventory" value={issueOf('stock')} onChange={setIssue('stock')} />
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="srOtherNotes">Other important information</Label>
            <Textarea id="srOtherNotes" value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* §7 Checklist — absorbed from the retired standalone Opening/Closing Checklists pages. */}
      <Card>
        <CardHeader>
          <CardTitle>{isClosing ? 'Closing' : 'Opening'} Checklist</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 p-2">
          {checklistItems.map((item) => {
            const done = checklist[item.id] === true
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setChecklist((prev) => ({ ...prev, [item.id]: !done }))}
                className="flex items-center gap-3 rounded-md p-3 text-left transition-colors duration-150 hover:bg-border/30"
              >
                {done ? (
                  <Check className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className={done ? 'text-foreground line-through' : 'text-foreground'}>{item.label}</span>
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* §7/§8 Handover */}
      <Card>
        <CardHeader>
          <CardTitle>Handover to Next Shift</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {priorities.map((priority, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Label htmlFor={`srPriority${index}`}>
                {isClosing ? 'Critical item' : 'Priority'} {index + 1}
              </Label>
              <Input
                id={`srPriority${index}`}
                value={priority}
                onChange={(e) => setPriorities((prev) => prev.map((p, i) => (i === index ? e.target.value : p)))}
              />
            </div>
          ))}
          {isClosing && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="srFollowUp">Follow-up required</Label>
                <Textarea id="srFollowUp" value={followUpRequired} onChange={(e) => setFollowUpRequired(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="srAck">PIC acknowledgement</Label>
                <Input id="srAck" value={picAcknowledgement} onChange={(e) => setPicAcknowledgement(e.target.value)} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pb-8">
        <Button type="button" variant="secondary" onClick={() => navigate('/operations/shift-reports')}>
          Cancel
        </Button>
        <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
          {submitting ? <Spinner className="h-4 w-4" /> : `Submit ${REPORT_TYPE_LABELS[type]} Report`}
        </Button>
      </div>
    </div>
  )
}
