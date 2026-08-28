import { db, COLLECTIONS, AppError } from '../../lib'
import { OUTLET_NAMES } from '../../lib/organization'
import { POSITION_LABELS } from '../../lib/positions'
import { PAYROLL_COMPONENT_SEEDS } from '../../lib/payroll'
import type { StatutoryRates } from './statutory'
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

/** §4.2 — one document per calendar year, addressed by the period's own year. */
export async function loadParameters(period: string): Promise<{ year: number; rates: StatutoryRates }> {
  const year = Number(period.slice(0, 4))
  const snap = await db.collection(COLLECTIONS.PAYROLL_PARAMETERS).doc(String(year)).get()
  if (!snap.exists) {
    throw new AppError(
      'failed-precondition',
      `No payroll parameters are on file for ${year}. Set the year's BPJS rates and wage ceilings before importing.`,
    )
  }
  const data = snap.data()!
  return {
    year,
    rates: {
      jkk: data.jkk as number,
      jkm: data.jkm as number,
      jhtCompany: data.jhtCompany as number,
      jhtEmployee: data.jhtEmployee as number,
      jpCompany: data.jpCompany as number,
      jpEmployee: data.jpEmployee as number,
      bpjsKesCo: data.bpjsKesCo as number,
      bpjsKesEmp: data.bpjsKesEmp as number,
      bpjsKesFam: data.bpjsKesFam as number,
      jpWageCeiling: data.jpWageCeiling as number,
      bpjsKesCeiling: data.bpjsKesCeiling as number,
    },
  }
}

/**
 * §4.3 — the discretionary registry. Falls back to the code-side seed set when
 * the collection is empty so a fresh environment can import before anyone has
 * opened the Components page; a seeded row always wins over its code twin.
 */
export async function loadComponents(): Promise<DiscretionaryComponent[]> {
  const snap = await db.collection(COLLECTIONS.PAYROLL_COMPONENTS).where('isActive', '==', true).get()

  const components: DiscretionaryComponent[] = snap.docs.map((doc) => {
    const data = doc.data()
    return {
      code: data.code as string,
      labelId: data.labelId as string,
      labelEn: data.labelEn as string,
      type: data.type as 'earning' | 'deduction',
      sortOrder: data.sortOrder as number,
      csvColumn: data.csvColumn as string,
    }
  })

  if (components.length === 0) {
    return PAYROLL_COMPONENT_SEEDS.map((seed) => ({
      code: seed.code,
      labelId: seed.labelId,
      labelEn: seed.labelEn,
      type: seed.type,
      sortOrder: seed.sortOrder,
      csvColumn: seed.csvColumn,
    }))
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
