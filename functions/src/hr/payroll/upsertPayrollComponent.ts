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
import { PAYROLL_COMPONENT_SEEDS, STATUTORY_COMPONENTS } from '../../lib/payroll'

export interface UpsertPayrollComponentInput {
  code: string
  labelId: string
  labelEn: string
  type: 'earning' | 'deduction'
  sortOrder: number
  isActive: boolean
  isTaxable: boolean
}

const CODE_RE = /^[A-Z0-9_]+$/

/**
 * payroll-components-payslip-design.md §4.3/§7 — discretionary component CRUD.
 *
 * The document id IS the code, so a component's identity is stable and the CSV
 * column derives from it. Deletion is soft only (`isActive: false`):
 * historical payslips hold componentId references and a hard delete would
 * orphan them.
 */
export const upsertPayrollComponent = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.PAYROLL_MANAGE_COMPONENTS)

    const input = (request.data ?? {}) as Partial<UpsertPayrollComponentInput>

    const code = (input.code ?? '').trim().toUpperCase()
    if (!code || !CODE_RE.test(code)) {
      throw new AppError('invalid-argument', 'code must be uppercase letters, digits and underscores.')
    }
    // A discretionary component cannot shadow a statutory one: they share the
    // CSV namespace and the payslip's componentId space.
    if (code in STATUTORY_COMPONENTS) {
      throw new AppError('invalid-argument', `"${code}" is a statutory component and is owned by code, not the registry.`)
    }
    const labelId = (input.labelId ?? '').trim()
    const labelEn = (input.labelEn ?? '').trim()
    if (!labelId || !labelEn) {
      throw new AppError('invalid-argument', 'Both the Indonesian and English labels are required.')
    }
    if (input.type !== 'earning' && input.type !== 'deduction') {
      throw new AppError('invalid-argument', 'type must be "earning" or "deduction".')
    }
    if (typeof input.sortOrder !== 'number' || !Number.isInteger(input.sortOrder) || input.sortOrder < 1) {
      throw new AppError('invalid-argument', 'sortOrder must be a positive integer.')
    }

    const ref = db.collection(COLLECTIONS.PAYROLL_COMPONENTS).doc(code)
    const existing = await ref.get()

    const fields = {
      code,
      labelId,
      labelEn,
      type: input.type,
      sortOrder: input.sortOrder,
      // Derived, never client-supplied: the CSV contract is keyed on the code.
      csvColumn: code,
      isActive: input.isActive !== false,
      isTaxable: input.isTaxable === true,
    }

    if (existing.exists) {
      await ref.update({ ...fields, ...updatedFields(user.uid) })
    } else {
      await ref.set({ ...fields, ...newDocumentBaseFields(user.uid) })
    }

    await recordAuditEvent({
      eventType: existing.exists ? 'PayrollComponentUpdated' : 'PayrollComponentCreated',
      category: 'HR',
      module: 'hr',
      resourceType: 'payrollComponent',
      resourceId: code,
      action: existing.exists ? 'update' : 'create',
      user,
      previousValues: existing.exists ? existing.data() : undefined,
      newValues: fields,
    })

    return successResponse({ code }, existing.exists ? 'Component updated.' : 'Component created.')
  } catch (error) {
    handleError(error)
  }
})

/**
 * §4.3 — writes the fourteen seeded entries. Idempotent: an existing component
 * is left alone, so re-running never overwrites an HR edit.
 */
export const seedPayrollComponents = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.PAYROLL_MANAGE_COMPONENTS)

    const writeBatch = db.batch()
    let created = 0

    const existing = await db.collection(COLLECTIONS.PAYROLL_COMPONENTS).get()
    const present = new Set(existing.docs.map((doc) => doc.id))

    for (const seed of PAYROLL_COMPONENT_SEEDS) {
      if (present.has(seed.code)) continue
      writeBatch.set(db.collection(COLLECTIONS.PAYROLL_COMPONENTS).doc(seed.code), {
        code: seed.code,
        labelId: seed.labelId,
        labelEn: seed.labelEn,
        type: seed.type,
        sortOrder: seed.sortOrder,
        csvColumn: seed.csvColumn,
        isActive: true,
        isTaxable: seed.isTaxable,
        ...newDocumentBaseFields(user.uid),
      })
      created += 1
    }

    if (created > 0) await writeBatch.commit()

    await recordAuditEvent({
      eventType: 'PayrollComponentsSeeded',
      category: 'HR',
      module: 'hr',
      resourceType: 'payrollComponent',
      resourceId: 'seed',
      action: 'create',
      user,
      metadata: { created, skipped: PAYROLL_COMPONENT_SEEDS.length - created },
    })

    return successResponse({ created }, `Seeded ${created} component(s).`)
  } catch (error) {
    handleError(error)
  }
})
