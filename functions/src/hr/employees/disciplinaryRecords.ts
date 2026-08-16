import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
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
import { DISCIPLINARY_TYPES, recordEmployeeActivity, type DisciplinaryType } from './helpers'

/**
 * FEATURE_SPECIFICATIONS.md Module 3 — Warning Records, Suspension Records,
 * Investigation Notes. Reverses a prior deliberate scope-down (HR_OPERATIONS.md
 * only asked for the 3 status fields already on Employee) — this is the detail
 * layer behind those fields, additive, no auto-sync back onto Employee.
 * Gated by employees.update, the same trust level already required to edit
 * the employee record itself.
 */

interface CreateDisciplinaryRecordInput {
  employeeId: string
  type: DisciplinaryType
  description: string
}

export const createDisciplinaryRecord = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_UPDATE)

    const input = (request.data ?? {}) as Partial<CreateDisciplinaryRecordInput>
    const employeeId = input.employeeId?.trim() ?? ''
    if (!employeeId) {
      throw new AppError('invalid-argument', 'employeeId is required.')
    }
    if (!input.type || !DISCIPLINARY_TYPES.includes(input.type)) {
      throw new AppError('invalid-argument', 'A valid disciplinary type is required.')
    }
    const description = input.description?.trim() ?? ''
    if (!description) {
      throw new AppError('invalid-argument', 'A description is required.')
    }

    const employeeSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId).get()
    if (!employeeSnap.exists) {
      throw new AppError('not-found', 'Employee not found.')
    }

    const ref = db.collection(COLLECTIONS.DISCIPLINARY_ACTIONS).doc()
    await ref.set({
      employeeId,
      type: input.type,
      description,
      investigationNotes: [],
      ...newDocumentBaseFields(user.uid, 'open'),
    })

    const employee = employeeSnap.data()!
    await recordEmployeeActivity(
      { id: employeeId, departmentId: employee.departmentId as string, outletId: employee.outletId as string },
      'disciplinaryWarning',
      `Disciplinary action recorded: ${input.type}.`,
      user,
    )

    await recordAuditEvent({
      eventType: 'DisciplinaryRecordCreated',
      category: 'HR',
      module: 'hr',
      resourceType: 'disciplinaryRecord',
      resourceId: ref.id,
      action: 'create',
      user,
      newValues: { employeeId, type: input.type },
    })

    return successResponse({ recordId: ref.id }, 'Disciplinary record created.')
  } catch (error) {
    return handleError(error)
  }
})

export const addInvestigationNote = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_UPDATE)

    const { recordId, note } = (request.data ?? {}) as { recordId?: string; note?: string }
    if (!recordId?.trim()) {
      throw new AppError('invalid-argument', 'recordId is required.')
    }
    const trimmedNote = note?.trim() ?? ''
    if (!trimmedNote) {
      throw new AppError('invalid-argument', 'A note cannot be empty.')
    }
    if (trimmedNote.length > 2000) {
      throw new AppError('invalid-argument', 'Note must be 2000 characters or fewer.')
    }

    const ref = db.collection(COLLECTIONS.DISCIPLINARY_ACTIONS).doc(recordId.trim())
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Disciplinary record not found.')
    }

    // Client-side timestamp inside the array entry — FieldValue.serverTimestamp()
    // is not allowed inside arrayUnion, same constraint taskComments avoids by
    // using a subcollection-shaped doc instead. A Date at write time is close
    // enough for an audit trail entry with second-level granularity.
    await ref.update({
      investigationNotes: FieldValue.arrayUnion({
        note: trimmedNote,
        authoredBy: user.uid,
        authoredAt: new Date().toISOString(),
      }),
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'InvestigationNoteAdded',
      category: 'HR',
      module: 'hr',
      resourceType: 'disciplinaryRecord',
      resourceId: recordId.trim(),
      action: 'update',
      user,
    })

    return successResponse({ recordId: recordId.trim() }, 'Note added.')
  } catch (error) {
    return handleError(error)
  }
})

export const closeDisciplinaryRecord = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_UPDATE)

    const { recordId } = (request.data ?? {}) as { recordId?: string }
    if (!recordId?.trim()) {
      throw new AppError('invalid-argument', 'recordId is required.')
    }

    const ref = db.collection(COLLECTIONS.DISCIPLINARY_ACTIONS).doc(recordId.trim())
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Disciplinary record not found.')
    }

    await ref.update({ status: 'closed', ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'DisciplinaryRecordClosed',
      category: 'HR',
      module: 'hr',
      resourceType: 'disciplinaryRecord',
      resourceId: recordId.trim(),
      action: 'update',
      user,
      newValues: { status: 'closed' },
    })

    return successResponse({ recordId: recordId.trim() }, 'Disciplinary record closed.')
  } catch (error) {
    return handleError(error)
  }
})
