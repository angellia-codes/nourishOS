import { onCall } from 'firebase-functions/v2/https'
import { db, COLLECTIONS, REGION, requireActiveUser, AppError, handleError, successResponse } from '../../lib'

const AGGREGATE_ROLES = ['hrManager', 'finance', 'generalManager', 'director', 'superAdmin']

interface ManningCostSummaryRow {
  outletId: string
  periodMonth: string
  totalGross: number
  totalNet: number
  employeeCount: number
}

interface PayslipLine {
  side: 'income' | 'deduction'
  amount: number
  isEmployerMirror: boolean
}

/**
 * Server aggregate over issued payslips, grouped by outlet + period — the same
 * "raw rows stay locked down, GM/Director see a rollup through a callable"
 * pattern getExitInterviewInsights established.
 *
 * Rewritten 2026-08-26: was an aggregate over the superseded `payrollRecords`
 * collection. The response shape is unchanged, so ManningBudgetReportPage
 * needs no edit — `periodMonth` keeps its old name even though the payslip
 * field is `period`.
 *
 * payroll-components-payslip-design.md §15: **`totalGross` filters
 * `isEmployerMirror === false`.** The stored column totals are inflated by the
 * mirror by design (§3, decision 3); a cost report that used them would
 * overstate gross by the employer's own contribution on every slip.
 * `totalEmployerCost` is deliberately not added in — this row answers "what
 * did we pay staff", not "what did staff cost in total".
 *
 * Superseded payslips are excluded so a correction does not double-count.
 */
export const getManningCostSummary = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    if (user.roleId !== 'superAdmin' && !AGGREGATE_ROLES.includes(user.roleId)) {
      throw new AppError('permission-denied', 'Manning cost is limited to HR, Finance and above.')
    }

    const snap = await db.collection(COLLECTIONS.PAYSLIPS).get()

    const groups = new Map<string, ManningCostSummaryRow>()
    for (const doc of snap.docs) {
      const payslip = doc.data()
      // Unissued (draft or rejected batch) and superseded slips are not payroll.
      if (!payslip.issuedAt || payslip.supersededByPayslipId) continue

      const outletId = (payslip.outletId as string | null) ?? 'unknown'
      const periodMonth = payslip.period as string
      const key = `${outletId}::${periodMonth}`

      let row = groups.get(key)
      if (!row) {
        row = { outletId, periodMonth, totalGross: 0, totalNet: 0, employeeCount: 0 }
        groups.set(key, row)
      }

      const lineItems = (payslip.lineItems as PayslipLine[] | undefined) ?? []
      row.totalGross += lineItems
        .filter((line) => line.side === 'income' && !line.isEmployerMirror)
        .reduce((total, line) => total + (line.amount ?? 0), 0)
      row.totalNet += (payslip.takeHomePay as number) ?? 0
      row.employeeCount += 1
    }

    const rows = Array.from(groups.values()).sort(
      (a, b) => a.outletId.localeCompare(b.outletId) || a.periodMonth.localeCompare(b.periodMonth),
    )

    return successResponse(rows, 'OK')
  } catch (error) {
    handleError(error)
  }
})
