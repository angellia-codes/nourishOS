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
import { CONTRACT_TYPES, requireIsoDate, recordEmployeeActivity, type ContractType } from '../employees/helpers'

interface RenewContractInput {
  employeeId: string
  contractType: ContractType
  contractStartDate: string
  contractEndDate?: string
}

/**
 * New contract version — HR.md §9 Renew/Extend Contract. Supersedes the
 * employee's current active contract row and updates
 * Employee.contractType/contractStartDate/contractEndDate to match (the
 * denormalized "current contract" cache the rest of the app — list, filters,
 * CSV export, contractAlerts.ts — already reads). An "extend" is just this
 * same callable with the same contractType and a later end date, so there's
 * no separate extend callable.
 */
export const renewContract = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_UPDATE)

    const input = (request.data ?? {}) as Partial<RenewContractInput>
    const employeeId = input.employeeId?.trim() ?? ''
    if (!employeeId) {
      throw new AppError('invalid-argument', 'employeeId is required.')
    }
    if (!input.contractType || !CONTRACT_TYPES.includes(input.contractType as ContractType)) {
      throw new AppError('invalid-argument', `contractType must be one of: ${CONTRACT_TYPES.join(', ')}.`)
    }
    const contractStartDate = requireIsoDate(input.contractStartDate, 'contractStartDate')
    const contractEndDate = input.contractEndDate ? requireIsoDate(input.contractEndDate, 'contractEndDate') : null
    if (input.contractType === 'fixedTerm' && !contractEndDate) {
      throw new AppError('invalid-argument', 'contractEndDate is required for fixed-term contracts.')
    }
    if (contractEndDate && contractEndDate <= contractStartDate) {
      throw new AppError('invalid-argument', 'contractEndDate must be later than contractStartDate.')
    }

    const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId)
    const contractRef = db.collection(COLLECTIONS.CONTRACTS).doc()

    const { employeeData, nextVersion } = await db.runTransaction(async (tx) => {
      const employeeSnap = await tx.get(employeeRef)
      if (!employeeSnap.exists) {
        throw new AppError('not-found', 'Employee not found.')
      }
      const activeSnap = await tx.get(
        db
          .collection(COLLECTIONS.CONTRACTS)
          .where('employeeId', '==', employeeId)
          .where('status', '==', 'active')
          .limit(1),
      )

      const employeeData = employeeSnap.data()!
      const nextVersion = activeSnap.empty ? 1 : (activeSnap.docs[0].data().version as number) + 1

      if (!activeSnap.empty) {
        tx.update(activeSnap.docs[0].ref, { ...updatedFields(user.uid), status: 'superseded' })
      }
      tx.set(contractRef, {
        employeeId,
        contractType: input.contractType,
        contractStartDate,
        contractEndDate,
        version: nextVersion,
        departmentId: employeeData.departmentId ?? null,
        outletId: employeeData.outletId ?? null,
        ...newDocumentBaseFields(user.uid, 'active'),
      })
      tx.update(employeeRef, {
        contractType: input.contractType,
        contractStartDate,
        contractEndDate,
        ...updatedFields(user.uid),
      })

      return { employeeData, nextVersion }
    })

    await recordEmployeeActivity(
      { id: employeeId, departmentId: employeeData.departmentId as string, outletId: employeeData.outletId as string },
      'contractRenewed',
      `Contract renewed (version ${nextVersion}, ${input.contractType}).`,
      user,
    )

    await recordAuditEvent({
      eventType: 'ContractRenewed',
      category: 'HR',
      module: 'hr',
      resourceType: 'contract',
      resourceId: contractRef.id,
      action: 'create',
      user,
      newValues: { employeeId, contractType: input.contractType, contractStartDate, contractEndDate, version: nextVersion },
    })

    return successResponse({ contractId: contractRef.id }, 'Contract renewed.')
  } catch (error) {
    handleError(error)
  }
})
