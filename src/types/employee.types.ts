import type { Timestamp } from 'firebase/firestore'
import type { BaseDocument } from './firestore.types'

export type EmploymentType = 'permanent' | 'fixedTerm' | 'freelance' | 'bod' | 'dailyWorker' | 'ojt'

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  permanent: 'Permanent (PKWTT)',
  fixedTerm: 'Fixed-Term (PKWT)',
  freelance: 'Freelance',
  bod: 'Board of Directors',
  dailyWorker: 'Daily Worker',
  ojt: 'On-the-Job Training',
}

/** Employee-number prefix per employmentType — PRD §9.1-F02. */
export const EMPLOYMENT_TYPE_ID_PREFIX: Record<EmploymentType, string> = {
  permanent: 'N',
  fixedTerm: 'N',
  freelance: 'N',
  bod: 'N',
  dailyWorker: 'DW',
  ojt: 'OJT',
}

/** Only permanent/fixedTerm run a probation cycle under current Nourish policy. */
export const EMPLOYMENT_TYPES_WITH_PROBATION: readonly EmploymentType[] = ['permanent', 'fixedTerm']

export type ProbationStatus = 'pending' | 'passed' | 'failed' | 'extended'
export type Gender = 'male' | 'female'
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'

/**
 * PRD §12.1 lists hindu/christian/muslim only, reflecting current Bali
 * outlet staff composition. Flagging rather than silently expanding —
 * confirm with HR before this becomes the enforced enum long-term.
 */
export type Religion = 'hindu' | 'christian' | 'muslim'

/** Indonesian personal income tax (PPh21) status codes. */
export type TaxStatus = 'TK0' | 'TK1' | 'TK2' | 'TK3' | 'K0' | 'K1' | 'K2' | 'K3'

export type DisciplinaryType = 'coaching' | 'verbalWarning' | 'SP1' | 'SP2' | 'SP3' | 'termination'

export interface Employee extends BaseDocument {
  employeeNumber: string // N-0001 / DW-0001 / OJT-0001 — server-generated, see employeeIdSequence.ts
  fullName: string
  preferredName?: string
  nik: string
  npwp?: string
  gender: Gender
  birthDate: Timestamp
  nationality?: string
  maritalStatus?: MaritalStatus
  religion: Religion
  phone: string
  email: string
  emergencyContactName: string
  emergencyContactPhone: string
  motherName: string
  permanentAddress: string
  domicileAddress: string
  bpjsTk?: string
  bpjsKesehatan?: string
  personalTaxStatus: TaxStatus
  positionId?: string
  managerId?: string
  employmentType: EmploymentType
  joinDate: Timestamp
  probationMonths?: number // required if employmentType is in EMPLOYMENT_TYPES_WITH_PROBATION
  probationEndDate?: Timestamp // server-calculated — never client-set
  probationStatus?: ProbationStatus
  contractEndDate?: Timestamp // required if employmentType === 'fixedTerm'
  activeStatus: 'active' | 'inactive'
  resignationDate?: Timestamp
  resignationReason?: string
  disciplinaryType?: DisciplinaryType
  disciplinaryStartPeriod?: Timestamp
  disciplinaryEndPeriod?: Timestamp
  recognitionType?: string
  recognitionPeriod?: string // "MM/YYYY"
  photoFileId?: string // links into the files collection (File Storage Service)
}

/**
 * Sub-collection at employees/{employeeId}/compensation/current — split out
 * from Employee per this plan's field-level-security decision. Only one
 * live document ("current") per employee; history is covered by
 * auditLogs, not a version array here.
 */
export interface EmployeeCompensation {
  basicSalary: number
  positionAllowance?: number
  phoneAllowance?: number
  transportationAllowance?: number
  bankAccountName?: string
  bankAccountNumber?: string
  updatedAt: Timestamp
  updatedBy: string
}