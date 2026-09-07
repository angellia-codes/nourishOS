import { db, COLLECTIONS, AppError } from '../../lib'
import { OUTLET_NAMES } from '../../lib/organization'
import { POSITION_LABELS } from '../../lib/positions'
import { PAYROLL_COMPONENT_SEEDS } from '../../lib/payroll'
import type { DiscretionaryComponent, ResolvedEmployee } from './validate'

/**
 * Everything `parsePayrollCsv` and `createPayrollBatch` both need to load
 * before they can validate — payroll-components-payslip-design.md §6.1.
 * Split out so the preview and the gate resolve identically; a preview that
 * consulted different data than the write would be worse than no preview.
 */

const PERIOD_RE = /^\d{4}-\d{2}$/

export function requirePeriod(raw: unknown): string {
  if (typeof raw !== 'string' || !PERIOD_RE.test(raw)) {
    throw new AppError('invalid-argument', 'period must be in YYYY-MM format.')
  }
  return raw
}

/**
 * §4.3 — the discretionary registry.
 *
 * Every seeded component is ALWAYS included, whatever the collection says. A
 * Firestore row overrides its labels and sort order, but cannot remove it:
 * PAYROLL_CSV_COLUMNS is built from the same seed list, so a seeded column
 * with no component behind it is read off the row, silently left out of the
 * line items, and then surfaces as an incomeTotalMismatch/deductionTotalMismatch
 * on exactly the rows that use it — which reads like a broken file rather than
 * a missing registry row. That is what LOAN_DEDUCTION and
 * INCOME_TAX_ALLOWANCE_21 did on a registry that predated them.
 *
 * `isActive` therefore only governs components HR added themselves, which have
 * no column in the template and are opt-in by definition.
 */
export async function loadComponents(): Promise<DiscretionaryComponent[]> {
  const snap = await db.collection(COLLECTIONS.PAYROLL_COMPONENTS).get()

  const stored = new Map<string, DiscretionaryComponent & { isActive: boolean }>()
  for (const doc of snap.docs) {
    const data = doc.data()
    const code = data.code as string | undefined
    if (!code) continue
    stored.set(code, {
      code,
      labelId: data.labelId as string,
      labelEn: data.labelEn as string,
      type: data.type as 'earning' | 'deduction',
      sortOrder: data.sortOrder as number,
      csvColumn: data.csvColumn as string,
      isActive: data.isActive !== false,
    })
  }

  const components: DiscretionaryComponent[] = []
  const seededCodes = new Set<string>()

  for (const seed of PAYROLL_COMPONENT_SEEDS) {
    seededCodes.add(seed.code)
    const row = stored.get(seed.code)
    components.push(
      row
        ? { code: row.code, labelId: row.labelId, labelEn: row.labelEn, type: row.type, sortOrder: row.sortOrder, csvColumn: row.csvColumn }
        : {
            code: seed.code,
            labelId: seed.labelId,
            labelEn: seed.labelEn,
            type: seed.type,
            sortOrder: seed.sortOrder,
            csvColumn: seed.csvColumn,
          },
    )
  }

  for (const [code, row] of stored) {
    if (seededCodes.has(code) || !row.isActive) continue
    components.push({
      code: row.code,
      labelId: row.labelId,
      labelEn: row.labelEn,
      type: row.type,
      sortOrder: row.sortOrder,
      csvColumn: row.csvColumn,
    })
  }

  return components
}

/**
 * Decision 7 — the payslip header is resolved from the employee record, never
 * from the CSV. The CSV's name and legacy id are cross-checks (§6.2), not
 * inputs.
 *
 * `position` resolves through POSITION_LABELS the same way every other display
 * of Employee.position does. §14 open item 3 is accepted, not fixed here: a
 * legacy free-text value (a department name, on older records) freezes onto
 * the slip exactly as stored.
 */
export async function loadEmployees(employeeNumbers: string[]): Promise<Map<string, ResolvedEmployee>> {
  const wanted = new Set(employeeNumbers.filter(Boolean))
  const snap = await db.collection(COLLECTIONS.EMPLOYEES).get()

  const resolved = new Map<string, ResolvedEmployee>()
  const compensationReads: Promise<void>[] = []

  for (const doc of snap.docs) {
    const data = doc.data()
    const employeeNumber = (data.employeeNumber as string | undefined) ?? ''
    if (!wanted.has(employeeNumber)) continue

    const position = (data.position as string | undefined) ?? ''
    const outletId = (data.outletId as string | undefined) ?? ''
    const entry: ResolvedEmployee = {
      employeeId: doc.id,
      employeeNumber,
      legacyEmployeeId: (data.legacyEmployeeId as string | null | undefined) ?? null,
      fullName: (data.fullName as string | undefined) ?? '',
      outletId,
      outletName: OUTLET_NAMES[outletId] ?? outletId,
      position: POSITION_LABELS[position] ?? position,
      taxStatus: (data.personalTaxStatus as string | null | undefined) ?? null,
      // Nothing populates users/{uid}.employeeId yet — the same named gap
      // Appraisal v2 and Employee Communication both carry. Denormalised as
      // null so a future ESS rule has the field to key on without a migration.
      employeeUid: null,
      status: (data.status as string | undefined) ?? 'active',
      employmentStatus: (data.employmentStatus as string | undefined) ?? '',
      bpjsTk: (data.bpjsTk as string | null | undefined) ?? null,
      bpjsKesehatan: (data.bpjsKesehatan as string | null | undefined) ?? null,
      compensationBasicSalary: null,
    }
    resolved.set(employeeNumber, entry)

    compensationReads.push(
      doc.ref
        .collection('compensation')
        .doc('current')
        .get()
        .then((compensation) => {
          if (compensation.exists) {
            entry.compensationBasicSalary = (compensation.data()?.basicSalary as number | undefined) ?? null
          }
        }),
    )
  }

  await Promise.all(compensationReads)
  return resolved
}

/** §6.2 — a second payslip for the same employee and period is a double payment. */
export async function loadExistingPayslipKeys(period: string): Promise<Set<string>> {
  const snap = await db.collection(COLLECTIONS.PAYSLIPS).where('period', '==', period).get()
  return new Set(snap.docs.map((doc) => `${doc.data().employeeId as string}::${period}`))
}

/**
 * §6.3 — anyone with a compensation record is expected on the file. Reads the
 * roster rather than a collection-group query so it stays one pass over the
 * same employees collection the resolver already walks.
 */
export async function loadCompensationEmployeeNumbers(): Promise<Set<string>> {
  const snap = await db.collection(COLLECTIONS.EMPLOYEES).where('status', '==', 'active').get()
  const numbers = new Set<string>()
  await Promise.all(
    snap.docs.map(async (doc) => {
      const compensation = await doc.ref.collection('compensation').doc('current').get()
      if (compensation.exists) {
        numbers.add((doc.data().employeeNumber as string | undefined) ?? '')
      }
    }),
  )
  numbers.delete('')
  return numbers
}
