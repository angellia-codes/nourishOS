import { onCall } from 'firebase-functions/v2/https'
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

/** §4.2 — rates are fractions; ceilings are rupiah. */
const RATE_FIELDS = [
  'jkk',
  'jkm',
  'jhtCompany',
  'jhtEmployee',
  'jpCompany',
  'jpEmployee',
  'bpjsKesCo',
  'bpjsKesEmp',
  'bpjsKesFam',
] as const

const CEILING_FIELDS = ['jpWageCeiling', 'bpjsKesCeiling'] as const

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * payroll-components-payslip-design.md §4.2/§7 — the annual statutory
 * parameters, one document per calendar year, keyed by the year itself.
 *
 * Super Admin only (`payroll.manageParameters` is granted to no role, and
 * superAdmin bypasses requirePermission). These values are what the §6.4
 * recompute checks every imported row against, so an incorrect rate here
 * silently blesses an incorrect payroll — the narrowest gate in the module.
 *
 * §14 open item 4: the JKK rate corresponds to an industry risk class. Confirm
 * it against the BPJS registration before saving; if Nourish Group's entities
 * carry different classifications this becomes a per-entity parameter, which
 * is a schema change, not a value change.
 */
export const upsertPayrollParameters = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.PAYROLL_MANAGE_PARAMETERS)

    const input = (request.data ?? {}) as Record<string, unknown>

    const year = input.year
    if (typeof year !== 'number' || !Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new AppError('invalid-argument', 'year must be a four-digit calendar year.')
    }

    const fields: Record<string, number | string> = { year }

    for (const field of RATE_FIELDS) {
      const value = input[field]
      if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 1) {
        throw new AppError('invalid-argument', `${field} must be a rate between 0 and 1 (e.g. 0.037 for 3.7%).`)
      }
      fields[field] = value
    }

    for (const field of CEILING_FIELDS) {
      const value = input[field]
      if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
        throw new AppError('invalid-argument', `${field} must be a positive rupiah amount.`)
      }
      fields[field] = value
    }

    const effectiveFrom = typeof input.effectiveFrom === 'string' ? input.effectiveFrom.trim() : ''
    if (!ISO_DATE_RE.test(effectiveFrom)) {
      throw new AppError('invalid-argument', 'effectiveFrom must be a YYYY-MM-DD date.')
    }
    if (!effectiveFrom.startsWith(String(year))) {
      throw new AppError('invalid-argument', `effectiveFrom must fall within ${year}.`)
    }
    fields.effectiveFrom = effectiveFrom

    const ref = db.collection(COLLECTIONS.PAYROLL_PARAMETERS).doc(String(year))
    const existing = await ref.get()

    if (existing.exists) {
      await ref.update({ ...fields, ...updatedFields(user.uid) })
    } else {
      await ref.set({ ...fields, ...newDocumentBaseFields(user.uid) })
    }

    await recordAuditEvent({
      eventType: existing.exists ? 'PayrollParametersUpdated' : 'PayrollParametersCreated',
      category: 'HR',
      module: 'hr',
      resourceType: 'payrollParameters',
      resourceId: String(year),
      action: existing.exists ? 'update' : 'create',
      user,
      previousValues: existing.exists ? existing.data() : undefined,
      newValues: fields,
    })

    return successResponse({ year }, `Payroll parameters for ${year} saved.`)
  } catch (error) {
    handleError(error)
  }
})
