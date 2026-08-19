import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, Circle } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { checklistItemsFor } from '@/constants'
import * as shiftReportService from '../shiftReportService'
import {
  REPORT_TYPE_LABELS,
  UNAVAILABLE_CATEGORY_LABELS,
  flaggedIssues,
  formatReportDate,
  outletName,
} from '../shiftReportFormat'
import type { DeptStaffing, ShiftReport } from '@/types'

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-foreground">{value}</p>
    </div>
  )
}

function StaffingLine({ label, value, showMidShift }: { label: string; value: DeptStaffing; showMidShift: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-muted-foreground">
        PIC {value.pic || '—'} &middot; {value.regularStaff} regular &middot; {value.dailyWorker} daily
        {showMidShift && ` · ${value.midShift} mid-shift`}
      </span>
    </div>
  )
}

/** opening_closing_shift_report_template.md — read-only view of one filed report. */
export function ShiftReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<ShiftReport | null | undefined>(undefined)

  useEffect(() => {
    if (!reportId) return
    let cancelled = false
    shiftReportService.getShiftReportById(reportId).then((row) => {
      if (!cancelled) setReport(row)
    })
    return () => {
      cancelled = true
    }
  }, [reportId])

  if (report === undefined) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }
  if (report === null) {
    return <EmptyState title="Report not found" description="It may have been removed, or you may not have access to it." />
  }

  const isClosing = report.reportType === 'closing'
  const issues = flaggedIssues(report)
  const checklistItems = checklistItemsFor(report.reportType)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/operations/shift-reports')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{REPORT_TYPE_LABELS[report.reportType]} Report</h1>
          <p className="text-sm text-muted-foreground">
            {outletName(report.outletId)} &middot; {report.shift} &middot; {formatReportDate(report.date)}
          </p>
        </div>
      </div>

      {(report.foodPromo || report.beveragePromo || report.specialMenu) && (
        <Card>
          <CardHeader>
            <CardTitle>Sales &amp; Promotion</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Field label="Food promo" value={report.foodPromo} />
            <Field label="Beverage promo" value={report.beveragePromo} />
            <Field label="Special menu" value={report.specialMenu} />
          </CardContent>
        </Card>
      )}

      {(report.unavailableItems.length > 0 || report.limitedItems.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Product Availability</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {report.unavailableItems.map((item, i) => (
              <div key={`na-${i}`}>
                <p className="font-medium text-foreground">
                  {UNAVAILABLE_CATEGORY_LABELS[item.category]} &middot; {item.product}
                </p>
                <p className="text-muted-foreground">
                  {item.reason || '—'}
                  {item.actionRequired && ` → ${item.actionRequired}`}
                </p>
              </div>
            ))}
            {report.limitedItems.map((item, i) => (
              <div key={`lim-${i}`}>
                <p className="font-medium text-foreground">
                  Limited &middot; {item.product} ({item.remainingQty} left)
                </p>
                {item.actionRequired && <p className="text-muted-foreground">{item.actionRequired}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Staffing &amp; Attendance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {isClosing && (
            <>
              <Field label="Manager IC" value={report.managerIc} />
              <Field label="Supervisor IC" value={report.supervisorIc} />
            </>
          )}
          <StaffingLine label="Floor" value={report.floor} showMidShift={isClosing} />
          <StaffingLine label="Bar" value={report.bar} showMidShift={isClosing} />
          <StaffingLine label="Kitchen" value={report.kitchen} showMidShift={isClosing} />
          <p className="text-sm text-muted-foreground">
            Steward {report.steward} &middot; Cashier {report.cashier || '—'}
            {report.otherPositions && ` · ${report.otherPositions}`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flagged Issues</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {issues.length === 0 ? (
            <p className="text-muted-foreground">Nothing flagged on this shift.</p>
          ) : (
            issues.map((issue) => (
              <div key={issue.label} className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
                <span className="text-foreground">
                  {issue.label}
                  {issue.details && <span className="text-muted-foreground"> — {issue.details}</span>}
                </span>
              </div>
            ))
          )}
          <Field label="Other information" value={report.otherNotes} />
          {(report.reviewRating !== null || report.reviewCount !== null || report.reviewKeyFeedback) && (
            <p className="text-muted-foreground">
              Online reviews: {report.reviewRating ?? '—'}★ across {report.reviewCount ?? '—'} review(s)
              {report.reviewKeyFeedback && ` — ${report.reviewKeyFeedback}`}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isClosing ? 'Closing' : 'Opening'} Checklist</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 p-2">
          {checklistItems.map((item) => {
            const done = report.checklistStatuses?.[item.id] === true
            return (
              <div key={item.id} className="flex items-center gap-3 p-2 text-sm">
                {done ? (
                  <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className={done ? 'text-muted-foreground line-through' : 'text-foreground'}>{item.label}</span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Handover</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {report.priorities.length === 0 ? (
            <p className="text-muted-foreground">No priorities recorded.</p>
          ) : (
            <ol className="flex list-inside list-decimal flex-col gap-0.5 text-foreground">
              {report.priorities.map((priority, i) => (
                <li key={i}>{priority}</li>
              ))}
            </ol>
          )}
          <Field label="Follow-up required" value={report.followUpRequired} />
          <Field label="PIC acknowledgement" value={report.picAcknowledgement} />
        </CardContent>
      </Card>
    </div>
  )
}
