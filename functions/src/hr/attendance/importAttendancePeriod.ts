import { onCall } from 'firebase-functions/v2/https'
import { getStorage } from 'firebase-admin/storage'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { createFileMetadataInternal } from '../../shared/fileStorage'
import {
  daysInMonth,
  findHeadPeriod,
  loadActiveEmployeeNumbers,
  loadEmployeesByNumber,
  outletIdByDisplayName,
  requirePeriod,
} from './context'
import { checkAndFoldHeader, validateAttendanceRows, type AttendanceRecordDraft } from './validate'

const MAX_ROWS = 500
/** Firestore caps a transaction at 500 mutations; leaves headroom for the period doc + a superseded-original update. */
const MAX_TRANSACTIONAL_RECORDS = 490

export interface ImportAttendancePeriodInput {
  period: string
  sourceFileName: string
  /** Raw CSV text, archived to Storage on success (§9). */
  sourceFileText: string
  rows: Record<string, string>[]
  isCorrection?: boolean
}

/**
 * attendance.md §5.4/§6.2 — re-validates everything server-side (never trusts
 * the preview), then writes the period + every record inside one transaction.
 *
 * V8, generalised slightly beyond the doc's literal wording: a plain
 * (non-correction) import refuses to run while ANY non-superseded period
 * already exists for the month, not only an approved/closed one — two heads
 * for the same month would make "the latest non-superseded period" (§7.1)
 * ambiguous. `isCorrection` is the only way past an existing head, and only
 * once that head is `approved` — a draft/rejected head was never readable to
 * anyone (attendanceRecords are isApproved-gated), so there's nothing to
 * "correct" about it; resubmit it via submitAttendancePeriod instead.
 */
export const importAttendancePeriod = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.ATTENDANCE_IMPORT)

    const { period, sourceFileName, sourceFileText, rows, isCorrection } = (request.data ??
      {}) as Partial<ImportAttendancePeriodInput>
    const validPeriod = requirePeriod(period)

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError('invalid-argument', 'rows must be a non-empty array.') // V9
    }
    if (rows.length > MAX_ROWS) {
      throw new AppError('invalid-argument', `A single import is limited to ${MAX_ROWS} rows.`)
    }
    if (rows.length > MAX_TRANSACTIONAL_RECORDS) {
      // ponytail: chunked non-transactional writes for >490 rows aren't built —
      // §5.4 itself says a single transaction suffices at current headcount
      // (161). Add chunking (functions/src/hr/payroll/createPayrollBatch.ts's
      // writePayslips is the pattern) if headcount ever approaches this.
      throw new AppError('invalid-argument', `A single import is limited to ${MAX_TRANSACTIONAL_RECORDS} rows today.`)
    }
    if (typeof sourceFileText !== 'string' || !sourceFileText) {
      throw new AppError('invalid-argument', 'sourceFileText is required.')
    }
    if (!sourceFileName) {
      throw new AppError('invalid-argument', 'sourceFileName is required.')
    }

    const header = Object.keys(rows[0] ?? {})
    const { hardFailures: headerFailures, rows: foldedRows } = checkAndFoldHeader(header, rows)
    if (headerFailures.length > 0) {
      throw new AppError('failed-precondition', headerFailures[0].message, { hardFailures: headerFailures })
    }

    const head = await findHeadPeriod(validPeriod)
    if (isCorrection) {
      if (!head) {
        throw new AppError('not-found', `No existing period ${validPeriod} to correct — import it as a first-time period instead.`)
      }
      if (head.data().status !== 'approved') {
        throw new AppError(
          'failed-precondition',
          `Only an approved period can be corrected (${validPeriod} is currently ${head.data().status as string}). Resubmit it for approval instead.`,
        )
      }
    } else if (head) {
      throw new AppError(
        'failed-precondition',
        `A period for ${validPeriod} already exists (${head.data().status as string}). Submit or resubmit it, or pass isCorrection if it's approved and needs fixing (V8).`,
      )
    }

    const [employeesByNumber, activeEmployeeNumbers] = await Promise.all([
      loadEmployeesByNumber(foldedRows.map((row) => (row.employee_number ?? '').trim())),
      loadActiveEmployeeNumbers(),
    ])

    const result = validateAttendanceRows({
      rows: foldedRows,
      originalRows: rows,
      daysInMonth: daysInMonth(validPeriod),
      employeesByNumber,
      outletIdByName: outletIdByDisplayName(),
      activeEmployeeNumbers,
    })

    if (result.hardFailures.length > 0) {
      throw new AppError(
        'failed-precondition',
        `${result.hardFailures.length} row(s) failed validation. Fix the file and re-upload — nothing was written.`,
        { hardFailures: result.hardFailures },
      )
    }

    const [year, month] = validPeriod.split('-').map(Number)
    // A first-time import gets doc id === period, which is what makes the V8
    // existence check above a plain-enough query and every later lookup by
    // month unambiguous for the common (no-correction) case. A correction
    // gets an auto id since "YYYY-MM" is already taken by the original.
    const periodRef = isCorrection
      ? db.collection(COLLECTIONS.ATTENDANCE_PERIODS).doc()
      : db.collection(COLLECTIONS.ATTENDANCE_PERIODS).doc(validPeriod)

    await db.runTransaction(async (tx) => {
      tx.set(periodRef, {
        period: validPeriod,
        year,
        month,
        daysInMonth: daysInMonth(validPeriod),
        recordCount: result.records.length,
        // Captured here because attendanceRecords are isApproved-gated and
        // unreadable pre-approval — the approver has nothing else to review
        // aggregates and warnings against (§6.1 step 1) otherwise.
        totals: result.totals,
        warnings: result.warnings,
        importedAt: null,
        importedBy: null,
        importFileName: sourceFileName,
        importFileId: null,
        supersedesPeriodId: isCorrection ? head!.id : null,
        supersededByPeriodId: null,
        approvalRequestId: null,
        ...newDocumentBaseFields(user.uid),
        // AttendancePeriodStatus overrides BaseDocument's 'active' default,
        // same as PayrollBatch's own status field does.
        status: 'draft',
      })

      for (const record of result.records) {
        const recordRef = db.collection(COLLECTIONS.ATTENDANCE_RECORDS).doc()
        tx.set(recordRef, attendanceRecordFields(periodRef.id, record, user.uid))
      }

      if (isCorrection) {
        tx.update(head!.ref, {
          status: 'closed',
          supersededByPeriodId: periodRef.id,
          ...updatedFields(user.uid),
        })
      }
    })

    // Storage/file-metadata isn't part of the Firestore transaction (Storage
    // writes can't join one) — best-effort archival after the records land,
    // mirroring uploadCandidateDocument.ts's Admin SDK save + createFileMetadataInternal.
    const storagePath = `attendance/${periodRef.id}/${sourceFileName}`
    await getStorage().bucket().file(storagePath).save(Buffer.from(sourceFileText, 'utf-8'), {
      contentType: 'text/csv',
      resumable: false,
    })
    const { fileId } = await createFileMetadataInternal(user, {
      storagePath,
      fileName: sourceFileName,
      mimeType: 'text/csv',
      fileSizeBytes: Buffer.byteLength(sourceFileText, 'utf-8'),
      module: 'hr',
      resourceType: 'attendanceImport',
      resourceId: periodRef.id,
    })
    await periodRef.update({ importFileId: fileId, importedAt: new Date().toISOString(), importedBy: user.uid })

    await recordAuditEvent({
      eventType: isCorrection ? 'AttendancePeriodCorrected' : 'AttendancePeriodImported',
      category: 'HR',
      module: 'hr',
      resourceType: 'attendancePeriod',
      resourceId: periodRef.id,
      action: isCorrection ? 'update' : 'create',
      user,
      newValues: { period: validPeriod, recordCount: result.records.length, totals: result.totals },
    })

    return successResponse(
      { periodId: periodRef.id, recordCount: result.records.length },
      `Period created with ${result.records.length} record(s). Submit it for approval to publish.`,
    )
  } catch (error) {
    return handleError(error)
  }
})

function attendanceRecordFields(periodId: string, record: AttendanceRecordDraft, uid: string) {
  return {
    periodId,
    employeeId: record.employeeId,
    employeeNumber: record.employeeNumber,
    employeeNameSnapshot: record.employeeNameSnapshot,
    departmentSnapshot: record.departmentSnapshot,
    outletIdSnapshot: record.outletIdSnapshot,
    employmentStatusSnapshot: record.employmentStatusSnapshot,
    days: record.days,
    rawCodesSeen: record.rawCodesSeen,
    lateCount: record.lateCount,
    totalDays: record.totalDays,
    // Stamped true only once the 'people/attendancePeriod' approval resolves
    // — see functions/src/hr/attendance/index.ts's approval-resolved handler.
    isApproved: false,
    ...newDocumentBaseFields(uid),
  }
}
