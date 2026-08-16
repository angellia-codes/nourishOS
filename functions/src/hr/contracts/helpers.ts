import { db, COLLECTIONS, newDocumentBaseFields, type AuthedUser } from '../../lib'
import { type ContractType } from '../employees/helpers'

interface CreateContractInternalInput {
  contractType: ContractType
  contractStartDate: string
  contractEndDate?: string | null
}

/**
 * Writes the first (version 1) contract row for a newly created employee —
 * called from createEmployeeInternal so every employee has version history
 * from day one. Validation (type/date shape, fixedTerm needs an end date,
 * end > start) already happened in createEmployeeInternal before this runs —
 * this is a pure write, no permission check (the caller is trusted, same
 * convention as recordEmployeeActivity).
 */
export async function createContractInternal(
  user: AuthedUser,
  employee: { id: string; departmentId?: string; outletId?: string },
  input: CreateContractInternalInput,
): Promise<void> {
  const ref = db.collection(COLLECTIONS.CONTRACTS).doc()
  await ref.set({
    employeeId: employee.id,
    contractType: input.contractType,
    contractStartDate: input.contractStartDate,
    contractEndDate: input.contractEndDate ?? null,
    version: 1,
    departmentId: employee.departmentId ?? null,
    outletId: employee.outletId ?? null,
    ...newDocumentBaseFields(user.uid, 'active'),
  })
}
