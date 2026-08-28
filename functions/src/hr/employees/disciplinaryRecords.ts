import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requireAnyPermission,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  todayIso,
  addDaysIso,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
  resolveEmployeeUid,
  type AuthedUser,
} from '../../lib'
import { submitApprovalInternal } from '../../shared/approval'
import { sendNotificationInternal, notifyUsersByRole } from '../../shared/notifications'
import {
  DISCIPLINARY_TYPES,
  DISCIPLINARY_VALIDITY_DAYS,
  ACKNOWLEDGEMENT_STATUSES,
  SIGNATURE_METHODS,
  PROPOSED_ACTION_CATEGORIES,
  requireIsoDate,
  recordEmployeeActivity,
  type AcknowledgementStatus,
  type DisciplinaryType,
  type ProposedActionCategory,
  type SignatureMethod,
} from './helpers'

/**
 * Employee Communication records — employee_communication.md.
 *
 * The collection is `disciplinaryActions`, which already existed as the HR-only
 * detail layer behind Employee's 3 disciplinary status fields
 * (FEATURE_SPECIFICATIONS.md Module 3). Rather than adding the spec's separate
 * `communicationRecords` collection (§19) and making HR file every SP1 twice,
 * the record was extended in place with the workflow, validity and
 * acknowledgement fields. Still additive, still **no auto-sync** back onto
 * Employee.disciplinaryType/Start/End — HR sets those independently.
 *
 * Authorization has two shapes here, and they are not interchangeable:
 *  - Employer-side writes (create/update/submit/close/notes) accept either
 *    `employees.communicate` (§5.4, what a department head holds) or HR's
 *    existing `employees.update` — see requireEmployerActor below.
 *  - Employee-side writes (statement, acknowledgement) gate on *identity*: the
 *    caller's uid must equal the record's `employeeUid`. Most floor staff have
 *    no NourishOS login at all, so HR may also act on their behalf, recording
 *    who witnessed it (§35 Rule 7).
 */

const MAX_TEXT = 5000
const MAX_SHORT_TEXT = 500

interface IncidentInput {
  date?: string
  time?: string
  location?: string
  details?: string
  policyReference?: string
  codeOfConductReference?: string
}

interface ProposedActionInput {
  category?: ProposedActionCategory
  targetDate?: string
}

interface RepeatIncidentInput {
  nextExpectedAction?: DisciplinaryType
  linkedPreviousRecordId?: string
}

interface CommunicationFormInput {
  type?: DisciplinaryType
  description?: string
  incident?: IncidentInput
  proposedAction?: ProposedActionInput
  repeatIncident?: RepeatIncidentInput
  validityDays?: number | null
}

/** Employer-editable statuses — §35 Rule 2, a record in review or signed is locked. */
const EDITABLE_STATUSES = ['draft']

function optionalText(value: unknown, fieldName: string, max = MAX_TEXT): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') {
    throw new AppError('invalid-argument', `${fieldName} must be text.`)
  }
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > max) {
    throw new AppError('invalid-argument', `${fieldName} must be ${max} characters or fewer.`)
  }
  return trimmed
}

function optionalIsoDate(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null || value === '') return null
  return requireIsoDate(value, fieldName)
}

/** 'HH:MM', 24-hour. The form records the incident time alongside its date (§9). */
function optionalTime(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new AppError('invalid-argument', `${fieldName} must be a HH:MM time.`)
  }
  return value
}

/**
 * §13 — the type's default window, overridable per record. A null validityDays
 * means "no expiry", which is correct for coaching and termination.
 */
function resolveValidityDays(type: DisciplinaryType, override: unknown): number | null {
  if (override === undefined) return DISCIPLINARY_VALIDITY_DAYS[type]
  if (override === null || override === '') return null
  const days = Number(override)
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    throw new AppError('invalid-argument', 'validityDays must be a whole number of days between 1 and 3650.')
  }
  return days
}

/**
 * Validates and normalizes the whole form body, shared by create and update so
 * the two can never drift. `type` and `description` are required by both (§34).
 */
function normalizeForm(input: CommunicationFormInput) {
  if (!input.type || !DISCIPLINARY_TYPES.includes(input.type)) {
    throw new AppError('invalid-argument', 'A valid communication type is required.')
  }
  const description = optionalText(input.description, 'description')
  if (!description) {
    throw new AppError('invalid-argument', 'A description is required.')
  }

  const incident = input.incident ?? {}
  const proposedAction = input.proposedAction ?? {}
  const repeatIncident = input.repeatIncident ?? {}

  if (
    proposedAction.category !== undefined &&
    proposedAction.category !== null &&
    !PROPOSED_ACTION_CATEGORIES.includes(proposedAction.category)
  ) {
    throw new AppError('invalid-argument', 'proposedAction.category is not a recognized category.')
  }
  if (
    repeatIncident.nextExpectedAction !== undefined &&
    repeatIncident.nextExpectedAction !== null &&
    !DISCIPLINARY_TYPES.includes(repeatIncident.nextExpectedAction)
  ) {
    throw new AppError('invalid-argument', 'repeatIncident.nextExpectedAction is not a recognized type.')
  }

  return {
    type: input.type,
    description,
    incident: {
      date: optionalIsoDate(incident.date, 'incident.date'),
      time: optionalTime(incident.time, 'incident.time'),
      location: optionalText(incident.location, 'incident.location', MAX_SHORT_TEXT),
      details: optionalText(incident.details, 'incident.details'),
      policyReference: optionalText(incident.policyReference, 'incident.policyReference', MAX_SHORT_TEXT),
      codeOfConductReference: optionalText(
        incident.codeOfConductReference,
        'incident.codeOfConductReference',
        MAX_SHORT_TEXT,
      ),
    },
    proposedAction: {
      category: proposedAction.category ?? null,
      targetDate: optionalIsoDate(proposedAction.targetDate, 'proposedAction.targetDate'),
    },
    repeatIncident: {
      nextExpectedAction: repeatIncident.nextExpectedAction ?? null,
      linkedPreviousRecordId: optionalText(
        repeatIncident.linkedPreviousRecordId,
        'repeatIncident.linkedPreviousRecordId',
        200,
      ),
    },
    validityDays: resolveValidityDays(input.type, input.validityDays),
  }
}

async function loadRecord(recordId: string) {
  const ref = db.collection(COLLECTIONS.DISCIPLINARY_ACTIONS).doc(recordId)
  const snap = await ref.get()
  if (!snap.exists) {
    throw new AppError('not-found', 'Communication record not found.')
  }
  return { ref, record: snap.data()! }
}

function requireRecordId(value: unknown): string {
  const recordId = typeof value === 'string' ? value.trim() : ''
  if (!recordId) {
    throw new AppError('invalid-argument', 'recordId is required.')
  }
  return recordId
}

/**
 * The employer-side gate. Two permissions, not one:
 *  - `employees.communicate` (§5.4) is what a department head holds — they issue
 *    communications for their own team but cannot edit employee records.
 *  - `employees.update` is HR's existing grant, accepted so hrManager and
 *    superAdmin work unchanged and no existing roles/{roleId} doc has to be
 *    hand-edited for this feature to ship.
 */
const EMPLOYER_PERMISSIONS = [PERMISSIONS.EMPLOYEES_COMMUNICATE, PERMISSIONS.EMPLOYEES_UPDATE]

function requireEmployerActor(user: AuthedUser): void {
  requireAnyPermission(user, EMPLOYER_PERMISSIONS)
}

/**
 * The same test without throwing — used where HR may act on the employee's
 * behalf (§35 Rule 7) but the employee themselves needs no permission at all.
 */
function isEmployerActor(user: AuthedUser): boolean {
  return user.roleId === 'superAdmin' || EMPLOYER_PERMISSIONS.some((p) => user.permissions.includes(p))
}

export const createDisciplinaryRecord = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireEmployerActor(user)

    const input = (request.data ?? {}) as CommunicationFormInput & { employeeId?: string }
    const employeeId = input.employeeId?.trim() ?? ''
    if (!employeeId) {
      throw new AppError('invalid-argument', 'employeeId is required.')
    }
    const form = normalizeForm(input)

    const employeeSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId).get()
    if (!employeeSnap.exists) {
      throw new AppError('not-found', 'Employee not found.')
    }
    const employee = employeeSnap.data()!

    // §8/§35 Rule 1 — employee facts are copied from the register, never
    // retyped. departmentId in particular is load-bearing: firestore.rules
    // reads it to give a department head their own department's records without
    // a get() to the employee doc.
    const ref = db.collection(COLLECTIONS.DISCIPLINARY_ACTIONS).doc()
    await ref.set({
      employeeId,
      employeeUid: await resolveEmployeeUid(employeeId),
      employeeName: (employee.fullName as string | undefined) ?? null,
      employeeNumber: (employee.employeeNumber as string | undefined) ?? null,
      departmentId: (employee.departmentId as string | undefined) ?? null,
      outletId: (employee.outletId as string | undefined) ?? null,
      position: (employee.position as string | undefined) ?? null,
      ...form,
      investigationNotes: [],
      employeeStatement: null,
      acknowledgement: null,
      approvalRequestId: null,
      releasedToEmployee: false,
      validFrom: null,
      validUntil: null,
      closureReason: null,
      ...newDocumentBaseFields(user.uid, 'draft'),
    })

    await recordEmployeeActivity(
      { id: employeeId, departmentId: employee.departmentId as string, outletId: employee.outletId as string },
      'disciplinaryWarning',
      `Employee communication drafted: ${form.type}.`,
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
      newValues: { employeeId, type: form.type },
    })

    return successResponse({ recordId: ref.id }, 'Communication record drafted.')
  } catch (error) {
    return handleError(error)
  }
})

/** §35 Rule 2 — drafts only. Once submitted the record is locked to ordinary editing. */
export const updateDisciplinaryRecord = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireEmployerActor(user)

    const input = (request.data ?? {}) as CommunicationFormInput & { recordId?: string }
    const recordId = requireRecordId(input.recordId)
    const form = normalizeForm(input)

    const { ref, record } = await loadRecord(recordId)
    if (!EDITABLE_STATUSES.includes(record.status as string)) {
      throw new AppError('failed-precondition', 'Only a draft can be edited. Records in review or signed are locked.')
    }

    await ref.update({ ...form, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'DisciplinaryRecordUpdated',
      category: 'HR',
      module: 'hr',
      resourceType: 'disciplinaryRecord',
      resourceId: recordId,
      action: 'update',
      user,
      previousValues: { type: record.type as string },
      newValues: { type: form.type },
    })

    return successResponse({ recordId }, 'Draft updated.')
  } catch (error) {
    return handleError(error)
  }
})

/**
 * §17 — routes the record into the Department Head → HR → GM chain. §34's
 * "before submission" checklist is enforced here rather than client-side only,
 * since the client is UX and this is the point of no return for editing.
 */
export const submitCommunicationRecord = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireEmployerActor(user)

    const recordId = requireRecordId((request.data ?? {}).recordId)
    const { ref, record } = await loadRecord(recordId)

    if (record.status !== 'draft') {
      throw new AppError('failed-precondition', `This record is already ${record.status as string}.`)
    }
    const incident = (record.incident ?? {}) as IncidentInput
    if (!incident.date) {
      throw new AppError('invalid-argument', 'Enter the incident date before submitting.')
    }
    if (!incident.details) {
      throw new AppError('invalid-argument', 'Enter the incident details before submitting.')
    }

    const approvalRequestId = await submitApprovalInternal({
      module: 'hr',
      resourceType: 'employeeCommunication',
      resourceId: recordId,
      requestedBy: user.uid,
      priority: 'high',
      // Assembled from the stored record, never from request.data — a client
      // that could name its own departmentId could shorten its own chain.
      context: {
        departmentId: (record.departmentId as string | null) ?? null,
        outletId: (record.outletId as string | null) ?? null,
        requesterRoleId: user.roleId,
      },
    })

    await ref.update({
      status: 'pendingApproval',
      approvalRequestId,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'CommunicationSubmitted',
      category: 'HR',
      module: 'hr',
      resourceType: 'disciplinaryRecord',
      resourceId: recordId,
      action: 'submit',
      user,
      newValues: { approvalRequestId, status: 'pendingApproval' },
    })

    return successResponse({ recordId, approvalRequestId }, 'Submitted for review.')
  } catch (error) {
    return handleError(error)
  }
})

/**
 * §10 — the employee's own account of the incident. Immutable once submitted;
 * HR may enter it on the employee's behalf when the statement arrives on paper,
 * which is recorded as `enteredOnBehalf` rather than passed off as the
 * employee's own keystrokes.
 */
export const submitEmployeeStatement = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)

    const { recordId: rawId, text } = (request.data ?? {}) as { recordId?: string; text?: string }
    const recordId = requireRecordId(rawId)
    const statement = optionalText(text, 'text')
    if (!statement) {
      throw new AppError('invalid-argument', 'A statement cannot be empty.')
    }

    const { ref, record } = await loadRecord(recordId)

    const isSubject = record.employeeUid === user.uid
    if (!isSubject && !isEmployerActor(user)) {
      throw new AppError('permission-denied', 'Only the employee named on this record, or HR, can submit a statement.')
    }
    if (isSubject && record.releasedToEmployee !== true) {
      throw new AppError('failed-precondition', 'This record has not been released to you yet.')
    }
    if ((record.employeeStatement as { submittedAt?: unknown } | null)?.submittedAt) {
      throw new AppError('failed-precondition', 'A statement has already been submitted for this record.')
    }

    await ref.update({
      employeeStatement: {
        text: statement,
        submittedAt: new Date().toISOString(),
        submittedBy: user.uid,
        enteredOnBehalf: !isSubject,
      },
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'CommunicationStatementSubmitted',
      category: 'HR',
      module: 'hr',
      resourceType: 'disciplinaryRecord',
      resourceId: recordId,
      action: 'update',
      user,
      newValues: { enteredOnBehalf: !isSubject },
    })

    return successResponse({ recordId }, 'Statement submitted.')
  } catch (error) {
    return handleError(error)
  }
})

/**
 * §16 + §35 Rule 5 — acknowledgement of *receipt*, which is not agreement, and
 * which is the event that starts the validity clock. All three outcomes
 * (acknowledged / refused / unableToSign) close the stage: a refusal to sign
 * does not void the warning, it is documented as a refusal.
 */
export const acknowledgeCommunicationRecord = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)

    const data = (request.data ?? {}) as {
      recordId?: string
      acknowledgementStatus?: AcknowledgementStatus
      method?: SignatureMethod
      signedName?: string
      circumstances?: string
    }
    const recordId = requireRecordId(data.recordId)

    const acknowledgementStatus = data.acknowledgementStatus
    if (
      !acknowledgementStatus ||
      !ACKNOWLEDGEMENT_STATUSES.includes(acknowledgementStatus) ||
      acknowledgementStatus === 'pending'
    ) {
      throw new AppError('invalid-argument', 'acknowledgementStatus must be acknowledged, refused, or unableToSign.')
    }
    const signedName = optionalText(data.signedName, 'signedName', MAX_SHORT_TEXT)
    // §18 — a typed name IS the signature method, so it is derived from the
    // payload rather than trusted from a separate field the caller might forget.
    const method = data.method ?? (signedName ? 'typedSignature' : 'acknowledgement')
    if (!SIGNATURE_METHODS.includes(method)) {
      throw new AppError('invalid-argument', 'method is not a recognized signature method.')
    }

    const { ref, record } = await loadRecord(recordId)
    if (record.status !== 'pendingEmployee') {
      throw new AppError(
        'failed-precondition',
        'This record is not awaiting employee acknowledgement — it must clear the GM first.',
      )
    }

    const isSubject = record.employeeUid === user.uid
    const employerActor = isEmployerActor(user)
    if (!isSubject && !employerActor) {
      throw new AppError('permission-denied', 'Only the employee named on this record, or HR, can acknowledge it.')
    }
    // §35 Rule 7 — a refusal or an inability to sign is always documented by
    // whoever witnessed it, never self-reported.
    if (acknowledgementStatus !== 'acknowledged' && !employerActor) {
      throw new AppError('permission-denied', 'A refusal or inability to sign must be recorded by HR or management.')
    }
    const circumstances = optionalText(data.circumstances, 'circumstances')
    if (acknowledgementStatus !== 'acknowledged' && !circumstances) {
      throw new AppError('invalid-argument', 'Describe the circumstances when the employee does not sign.')
    }

    const validityDays = (record.validityDays as number | null) ?? null
    const validFrom = todayIso()
    const validUntil = validityDays === null ? null : addDaysIso(validityDays, validFrom)

    await ref.update({
      acknowledgement: {
        status: acknowledgementStatus,
        at: FieldValue.serverTimestamp(),
        by: user.uid,
        method,
        signedName,
        witnessedBy: isSubject ? null : user.uid,
        circumstances,
      },
      validFrom,
      validUntil,
      // A record with no validity window has nothing left to track once it is
      // acknowledged, so it closes rather than sitting 'active' forever.
      status: validUntil === null ? 'closed' : 'active',
      ...updatedFields(user.uid),
    })

    await notifyUsersByRole({
      role: 'hrManager',
      module: 'hr',
      priority: 'medium',
      title: 'Communication Acknowledged',
      message: `${(record.employeeName as string | null) ?? 'An employee'} — ${record.type as string} recorded as ${acknowledgementStatus}${validUntil ? `, valid until ${validUntil}` : ''}.`,
      referenceId: recordId,
    })

    await recordAuditEvent({
      eventType: 'CommunicationAcknowledged',
      category: 'HR',
      module: 'hr',
      resourceType: 'disciplinaryRecord',
      resourceId: recordId,
      action: 'update',
      user,
      newValues: { acknowledgementStatus, validFrom, validUntil, onBehalf: !isSubject },
    })

    return successResponse({ recordId, validFrom, validUntil }, 'Acknowledgement recorded.')
  } catch (error) {
    return handleError(error)
  }
})

export const addInvestigationNote = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireEmployerActor(user)

    const { recordId: rawId, note } = (request.data ?? {}) as { recordId?: string; note?: string }
    const recordId = requireRecordId(rawId)
    const trimmedNote = note?.trim() ?? ''
    if (!trimmedNote) {
      throw new AppError('invalid-argument', 'A note cannot be empty.')
    }
    if (trimmedNote.length > 2000) {
      throw new AppError('invalid-argument', 'Note must be 2000 characters or fewer.')
    }

    const { ref } = await loadRecord(recordId)

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
      resourceId: recordId,
      action: 'update',
      user,
    })

    return successResponse({ recordId }, 'Note added.')
  } catch (error) {
    return handleError(error)
  }
})

/**
 * §40 — closing is the terminal state a record reaches through the UI; nothing
 * is ever physically deleted here. Reachable from active/expired, and from the
 * legacy `open` status that predates the workflow.
 */
export const closeDisciplinaryRecord = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireEmployerActor(user)

    const { recordId: rawId, closureReason } = (request.data ?? {}) as {
      recordId?: string
      closureReason?: string
    }
    const recordId = requireRecordId(rawId)

    const { ref, record } = await loadRecord(recordId)
    const status = record.status as string
    if (!['active', 'expired', 'open'].includes(status)) {
      throw new AppError(
        'failed-precondition',
        'Only an active, expired or legacy open record can be closed. Leave a draft unsubmitted to abandon it.',
      )
    }

    await ref.update({
      status: 'closed',
      closureReason: optionalText(closureReason, 'closureReason') ?? null,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'DisciplinaryRecordClosed',
      category: 'HR',
      module: 'hr',
      resourceType: 'disciplinaryRecord',
      resourceId: recordId,
      action: 'update',
      user,
      previousValues: { status },
      newValues: { status: 'closed' },
    })

    return successResponse({ recordId }, 'Communication record closed.')
  } catch (error) {
    return handleError(error)
  }
})

/**
 * Notifies whoever has to act next once the approval chain clears — the
 * employee if they have a login, HR otherwise, since somebody has to physically
 * take the form to an employee with no account. Exported for the
 * approval-resolved handler in ./index.ts.
 */
export async function notifyEmployeeOfRelease(
  recordId: string,
  record: { employeeUid?: string | null; employeeName?: string | null; type?: string },
): Promise<void> {
  const label = record.type ?? 'communication'

  if (record.employeeUid) {
    await sendNotificationInternal({
      type: 'alert',
      title: 'Communication Awaiting Your Acknowledgement',
      message: `A ${label} record has been issued to you. Read it, add your statement, and acknowledge receipt.`,
      module: 'hr',
      priority: 'high',
      recipientUid: record.employeeUid,
      referenceModule: 'hr',
      referenceId: recordId,
      actionUrl: `/communications/employee/${recordId}`,
    })
    return
  }

  await notifyUsersByRole({
    role: 'hrManager',
    module: 'hr',
    priority: 'high',
    title: 'Communication Ready to Serve',
    message: `${record.employeeName ?? 'An employee'} has no NourishOS account — print the ${label} record, collect the signature, then record the acknowledgement.`,
    referenceId: recordId,
  })
}
