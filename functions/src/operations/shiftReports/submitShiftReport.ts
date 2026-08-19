import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  todayIso,
  checklistItemsFor,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { OUTLET_DEPARTMENTS } from '../../lib/organization'
import { notifyUsersByRole } from '../../shared/notifications'
import {
  checklistStatuses,
  count,
  issue,
  limitedItems,
  optionalNumber,
  priorities,
  staffing,
  text,
  unavailableItems,
  type ShiftReportType,
} from './helpers'

interface SubmitShiftReportInput {
  reportType: ShiftReportType
  shift: string
  /** Defaults to the caller's own outlet if omitted — validated against the org chart when sent. */
  outletId?: string
  [field: string]: unknown
}

/**
 * opening_closing_shift_report_template.md — files one Opening or Closing
 * Shift Report for an outlet.
 *
 * Document id is deterministic (`outletId__date__reportType`), the same trick
 * the retired checklist completion used: the once-per-outlet-per-day rule is
 * enforced by a single .get() instead of a query, and the closing report can
 * find that morning's opening report without an index. `shift` is a label on
 * the document, not part of the id — one opening and one closing per day.
 *
 * Section §7's checklist is stored inline here because the standalone
 * Opening/Closing Checklists feature was absorbed into this report; the item
 * table still lives in functions/src/lib/checklist.ts.
 */
export const submitShiftReport = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.SHIFT_REPORTS_SUBMIT)

    const input = (request.data ?? {}) as Partial<SubmitShiftReportInput>

    if (input.reportType !== 'opening' && input.reportType !== 'closing') {
      throw new AppError('invalid-argument', 'reportType must be "opening" or "closing".')
    }
    const reportType = input.reportType

    const shift = text(input.shift, 120)
    if (!shift) {
      throw new AppError('invalid-argument', 'Shift is required.')
    }

    const outletId = input.outletId ?? user.outletId
    if (!outletId) {
      throw new AppError('failed-precondition', 'Your account has no outlet assigned.')
    }
    // Same validated-override pattern as submitDailyReport: the client may file
    // for another outlet, but only one that actually exists in the org chart.
    if (!OUTLET_DEPARTMENTS[outletId]) {
      throw new AppError('invalid-argument', 'Unknown outlet.')
    }

    const knownItemIds = new Set(checklistItemsFor(reportType).map((item) => item.id))
    const checklist = checklistStatuses(input.checklistStatuses, knownItemIds)

    const date = todayIso()
    const docId = `${outletId}__${date}__${reportType}`
    const ref = db.collection(COLLECTIONS.SHIFT_HANDOVERS).doc(docId)
    if ((await ref.get()).exists) {
      throw new AppError(
        'already-exists',
        `A ${reportType} shift report has already been filed for this outlet today.`,
      )
    }

    // §8 — the closing report points back at the morning's opening report so
    // the two halves of the day can be read together. Null when none was filed.
    let openingReportId: string | null = null
    if (reportType === 'closing') {
      const openingId = `${outletId}__${date}__opening`
      openingReportId = (await db.collection(COLLECTIONS.SHIFT_HANDOVERS).doc(openingId).get()).exists
        ? openingId
        : null
    }

    const isClosing = reportType === 'closing'
    const blankIssue = { present: false, details: '' }

    await ref.set({
      reportType,
      outletId,
      date,
      shift,
      picUid: user.uid,

      // §2 Sales & Promotion
      foodPromo: text(input.foodPromo),
      beveragePromo: text(input.beveragePromo),
      specialMenu: text(input.specialMenu),

      // §3 Product Availability
      unavailableItems: unavailableItems(input.unavailableItems),
      limitedItems: limitedItems(input.limitedItems),

      // §4 Customer Feedback / Experience
      complaints: issue(input.complaints),
      customerFeedback: issue(input.customerFeedback),
      reviewRating: optionalNumber(input.reviewRating, 5),
      reviewCount: optionalNumber(input.reviewCount, 1_000_000),
      reviewKeyFeedback: text(input.reviewKeyFeedback),

      // §5 Staffing & Attendance — the manager/supervisor IC pair is closing-only.
      managerIc: isClosing ? text(input.managerIc, 120) : '',
      supervisorIc: isClosing ? text(input.supervisorIc, 120) : '',
      floor: staffing(input.floor),
      bar: staffing(input.bar),
      kitchen: staffing(input.kitchen),
      steward: count(input.steward),
      cashier: text(input.cashier, 120),
      otherPositions: text(input.otherPositions, 500),
      absent: issue(input.absent),
      sickLeave: issue(input.sickLeave),
      permission: issue(input.permission),

      // §6 Operational & Maintenance Issues — hygiene and stock are closing-only.
      maintenance: issue(input.maintenance),
      equipment: issue(input.equipment),
      hygiene: isClosing ? issue(input.hygiene) : blankIssue,
      stock: isClosing ? issue(input.stock) : blankIssue,
      otherNotes: text(input.otherNotes),

      // §7 Closing Checklist (absorbed feature)
      checklistStatuses: checklist,

      // §7/§8 Handover
      priorities: priorities(input.priorities),
      followUpRequired: isClosing ? text(input.followUpRequired) : '',
      picAcknowledgement: isClosing ? text(input.picAcknowledgement, 120) : '',

      openingReportId,

      ...newDocumentBaseFields(user.uid, 'submitted'),
    })

    await recordAuditEvent({
      eventType: 'ShiftReportSubmitted',
      category: 'Operations',
      module: 'operations',
      resourceType: 'shiftReport',
      resourceId: docId,
      action: 'create',
      user,
      newValues: { date, outletId, reportType, shift },
    })

    // Routine filing, so no WhatsApp and no FONNTE_TOKEN declaration — the
    // escalation paths in Daily Updates and Work Orders are what earn that.
    await notifyUsersByRole({
      role: 'generalManager',
      module: 'operations',
      title: `${reportType === 'opening' ? 'Opening' : 'Closing'} shift report filed`,
      message: `${outletId} · ${shift} · ${date}`,
      referenceId: docId,
      priority: 'informational',
    })

    return successResponse({ reportId: docId }, 'Shift report submitted.')
  } catch (error) {
    return handleError(error)
  }
})
