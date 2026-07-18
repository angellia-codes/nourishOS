import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { ACK_PARTIES, addMonths, allocateActionNumber, nextEscalationLevel, requireDisciplinaryType, validityMonths } from './helpers'

interface CreateInput {
  employeeId?: string
  incidentDetails?: string
  disciplinaryType?: string
  employeeStatement?: string
  proposedSolution?: string
  companyFurtherAction?: string
  employeeFurtherAction?: string
  linkedIncidentId?: string
}

// employee-disciplinary-action.md §5 — draft creation. Captures the incident,
// sets the type, and computes validUntil from the ladder (AC-2). employeeId
// scoping (§6): a Department Leader raises actions only for their own
// department; cross-department requires disciplinary.manage (HR / Super Admin).
export const createDisciplinaryAction = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.DISCIPLINARY_CREATE)

    const input = (request.data ?? {}) as CreateInput
    if (!input.employeeId) {
      throw new AppError('invalid-argument', 'employeeId is required.')
    }
    if (!input.incidentDetails?.trim()) {
      throw new AppError('invalid-argument', 'incidentDetails is required.')
    }
    const disciplinaryType = requireDisciplinaryType(input.disciplinaryType)

    const employeeSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(input.employeeId).get()
    if (!employeeSnap.exists) {
      throw new AppError('not-found', 'Employee not found.')
    }
    const employee = employeeSnap.data()!

    if (employee.departmentId !== user.departmentId && !user.permissions.includes(PERMISSIONS.DISCIPLINARY_MANAGE)) {
      throw new AppError('permission-denied', 'You can only raise a disciplinary action for an employee in your own department.')
    }

    const validFrom = new Date().toISOString().slice(0, 10)
    const validUntil = addMonths(validFrom, validityMonths(disciplinaryType))
    const actionNumber = await allocateActionNumber()

    const actionRef = db.collection(COLLECTIONS.DISCIPLINARY_ACTIONS).doc()
    await actionRef.set({
      actionNumber,
      employeeId: input.employeeId,
      employeeName: employee.fullName,
      incidentDetails: input.incidentDetails.trim(),
      disciplinaryType,
      employeeStatement: input.employeeStatement?.trim() ?? '',
      proposedSolution: input.proposedSolution?.trim() ?? null,
      companyFurtherAction: input.companyFurtherAction?.trim() ?? null,
      employeeFurtherAction: input.employeeFurtherAction?.trim() ?? null,
      nextEscalationLevel: nextEscalationLevel(disciplinaryType) ?? null,
      validFrom,
      validUntil,
      linkedIncidentId: input.linkedIncidentId ?? null,
      // Four parties, none signed yet (§3/§7). Finalizes once all are recorded (AC-3).
      acknowledgments: ACK_PARTIES.map((party) => ({ party, acknowledgedAt: null, acknowledgedBy: null })),
      outletId: employee.outletId,
      departmentId: employee.departmentId,
      ...newDocumentBaseFields(user.uid, 'draft'),
    })

    await recordAuditEvent({
      eventType: 'DisciplinaryActionCreated',
      category: 'HR',
      module: 'disciplinary',
      resourceType: 'disciplinaryAction',
      resourceId: actionRef.id,
      action: 'create',
      user,
      newValues: { actionNumber, employeeId: input.employeeId, disciplinaryType },
    })

    return successResponse({ actionId: actionRef.id, actionNumber }, 'Disciplinary action draft created.')
  } catch (error) {
    handleError(error)
  }
})
