import { normalizePhone } from '../../lib/phone'
import {
  BLOOD_TYPES,
  EMERGENCY_CONTACT_RELATIONSHIPS,
  GENDERS,
  MARITAL_STATUSES,
  RELIGIONS,
  TSHIRT_SIZES,
} from '../employees/helpers'

/**
 * welcome-portal.md §4.2 — the only fields a new hire may write, and the rules
 * each one is held to.
 *
 * Deliberately pure: no `db`, no Firestore types, no AppError. Everything here
 * takes its input as an argument and returns a result, so the same code that
 * backs `saveWelcomeDraft`/`submitWelcomeForm` runs unchanged under
 * `node --test` (functions/test/welcome-validate.test.mjs). This is the split
 * hr/attendance/validate.ts already set.
 *
 * §4.2's rule is "any key outside this list is rejected, not ignored" — a
 * silent drop would let a caller believe they had set `salary` and move on.
 * `pickWelcomeDraft` therefore reports unknown keys rather than filtering them.
 *
 * The spec's field names are NOT all the shipped field names. The employee
 * record has carried `birthPlace`, `email`, `permanentAddress`, `nationalId`
 * (NIK) and `taxNumber` (NPWP) since it was written, so the portal speaks the
 * spec's vocabulary and this module is where the two meet. Renaming the
 * shipped fields instead would have touched every HR page, the importer,
 * payroll and the reports for no behavioural gain.
 */

/** Spec field name → the field actually written on `employees/{id}`. */
export const WELCOME_FIELD_TO_EMPLOYEE: Record<string, string> = {
  fullName: 'fullName',
  placeOfBirth: 'birthPlace',
  birthDate: 'birthDate',
  gender: 'gender',
  religion: 'religion',
  maritalStatus: 'maritalStatus',
  bloodType: 'bloodType',
  tshirtSize: 'tshirtSize',
  motherName: 'motherName',
  phone: 'phone',
  personalEmail: 'email',
  permanentAddressKtp: 'permanentAddress',
  domicileAddress: 'domicileAddress',
  emergencyContactName: 'emergencyContactName',
  emergencyContactPhone: 'emergencyContactPhone',
  emergencyContactAddress: 'emergencyContactAddress',
  emergencyContactRelationship: 'emergencyContactRelationship',
  emergencyContactRelationshipOther: 'emergencyContactRelationshipOther',
  nik: 'nationalId',
  npwp: 'taxNumber',
  bpjsTk: 'bpjsTk',
  bpjsKesehatan: 'bpjsKesehatan',
  photoFileId: 'photoFileId',
  ktpFileId: 'ktpFileId',
  kkFileId: 'kkFileId',
  supportingFileIds: 'supportingFileIds',
}

/**
 * §4.2's Financial group. Kept out of the map above on purpose: these two are
 * the only fields that must NOT land on the main employee document — they go
 * to `employees/{id}/compensation/current`, via setEmployeeBankDetailsInternal.
 */
export const WELCOME_BANK_FIELDS = ['bankAccountName', 'bankAccountNumber'] as const

export const WELCOME_FIELDS: readonly string[] = [
  ...Object.keys(WELCOME_FIELD_TO_EMPLOYEE),
  ...WELCOME_BANK_FIELDS,
]

/**
 * §10.4's named attacks, plus every `onboarding*` status field. Listed
 * explicitly so a rejection can say *why* rather than "unknown field" — a hire
 * who mistypes a key gets a different message from a caller trying to set
 * their own salary.
 */
const PRIVILEGED_FIELDS = new Set([
  'employeeNumber',
  'outletId',
  'departmentId',
  'position',
  'positionId',
  'joinDate',
  'status',
  'isArchived',
  'salary',
  'basicSalary',
  'positionAllowance',
  'phoneAllowance',
  'transportationAllowance',
  'employmentStatus',
  'contractType',
  'probationMonths',
  'probationStatus',
  'managerId',
  'onboardingStatus',
  'onboardingSubmittedAt',
  'onboardingVerifiedAt',
  'onboardingVerifiedBy',
  'onboardingRejectionReason',
])

export interface FieldIssue {
  field: string
  message: string
}

const MAX_NAME = 120
const MAX_ADDRESS = 500
/** §6 — "supporting (optional, up to 2)". */
export const MAX_SUPPORTING_FILES = 2
/** Oldest and youngest plausible hire — §11 "DOB plausible". */
const MIN_AGE_YEARS = 15
const MAX_AGE_YEARS = 80

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

/** Whole years between an ISO birth date and an ISO "today", both YYYY-MM-DD. */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  let age = ty - by
  if (tm < bm || (tm === bm && td < bd)) age -= 1
  return age
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Lenient pass, used by autosave. Keeps whatever is well-shaped, reports what
 * it refused, and never demands a field the hire has not reached yet — a
 * half-filled step must still save or the autosave promise is a lie.
 */
export function pickWelcomeDraft(raw: unknown): { draft: Record<string, unknown>; rejected: FieldIssue[] } {
  const input = (raw ?? {}) as Record<string, unknown>
  const draft: Record<string, unknown> = {}
  const rejected: FieldIssue[] = []

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue

    if (PRIVILEGED_FIELDS.has(key)) {
      rejected.push({ field: key, message: 'That field is set by HR and cannot be changed here.' })
      continue
    }
    if (!WELCOME_FIELDS.includes(key)) {
      rejected.push({ field: key, message: 'Unknown field.' })
      continue
    }

    if (key === 'supportingFileIds') {
      if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
        rejected.push({ field: key, message: 'Expected a list of file ids.' })
        continue
      }
      if (value.length > MAX_SUPPORTING_FILES) {
        rejected.push({ field: key, message: `At most ${MAX_SUPPORTING_FILES} supporting files.` })
        continue
      }
      draft[key] = value
      continue
    }

    if (typeof value !== 'string') {
      rejected.push({ field: key, message: 'Expected text.' })
      continue
    }
    if (value.length > MAX_ADDRESS) {
      rejected.push({ field: key, message: `Must be ${MAX_ADDRESS} characters or fewer.` })
      continue
    }
    draft[key] = value.trim()
  }

  return { draft, rejected }
}

export interface WelcomeSubmission {
  /** Ready to spread onto the employee document. Shipped field names. */
  employeeUpdates: Record<string, unknown>
  /** Written to the compensation sub-document, never to the employee doc. */
  bank: { bankAccountName: string; bankAccountNumber: string }
  issues: FieldIssue[]
}

/**
 * Strict pass, used by submit. The server is authoritative (§11): the client's
 * own validation is a courtesy, and this runs over the stored draft rather
 * than over whatever the submit call happens to carry.
 *
 * Collects every problem instead of throwing on the first, because §11 wants
 * per-field errors — one round trip per typo is not a form, it is a quiz.
 */
export function validateWelcomeSubmission(draft: Record<string, unknown>, today: string): WelcomeSubmission {
  const issues: FieldIssue[] = []
  const out: Record<string, unknown> = {}

  const text = (field: string, label: string, max: number, required = true): string => {
    const value = typeof draft[field] === 'string' ? (draft[field] as string).trim() : ''
    if (!value) {
      if (required) issues.push({ field, message: `${label} is required.` })
      return ''
    }
    if (value.length > max) {
      issues.push({ field, message: `${label} must be ${max} characters or fewer.` })
      return ''
    }
    return value
  }

  const oneOf = (field: string, label: string, allowed: readonly string[]): string => {
    const value = typeof draft[field] === 'string' ? (draft[field] as string).trim() : ''
    if (!value) {
      issues.push({ field, message: `${label} is required.` })
      return ''
    }
    if (!allowed.includes(value)) {
      issues.push({ field, message: `${label} must be one of: ${allowed.join(', ')}.` })
      return ''
    }
    return value
  }

  const numeric = (field: string, label: string, lengths: number[], required = true): string => {
    const value = typeof draft[field] === 'string' ? (draft[field] as string).trim() : ''
    if (!value) {
      if (required) issues.push({ field, message: `${label} is required.` })
      return ''
    }
    const digits = digitsOnly(value)
    if (!lengths.includes(digits.length)) {
      const wanted = lengths.length === 1 ? `${lengths[0]} digits` : `${lengths.join(' or ')} digits`
      issues.push({ field, message: `${label} must be ${wanted}.` })
      return ''
    }
    return digits
  }

  // Personal
  out.fullName = text('fullName', 'Full name', MAX_NAME)
  out.birthPlace = text('placeOfBirth', 'Place of birth', MAX_NAME)
  const birthDate = typeof draft.birthDate === 'string' ? draft.birthDate.trim() : ''
  if (!birthDate) {
    issues.push({ field: 'birthDate', message: 'Date of birth is required.' })
  } else if (!isIsoDate(birthDate)) {
    issues.push({ field: 'birthDate', message: 'Date of birth must be a valid date.' })
  } else {
    const age = ageOn(birthDate, today)
    if (age < MIN_AGE_YEARS || age > MAX_AGE_YEARS) {
      issues.push({ field: 'birthDate', message: 'Check your date of birth — that does not look right.' })
    } else {
      out.birthDate = birthDate
    }
  }
  out.gender = oneOf('gender', 'Gender', GENDERS)
  out.religion = oneOf('religion', 'Religion', RELIGIONS)
  out.maritalStatus = oneOf('maritalStatus', 'Marital status', MARITAL_STATUSES)
  out.bloodType = oneOf('bloodType', 'Blood type', BLOOD_TYPES)
  out.tshirtSize = oneOf('tshirtSize', 'T-shirt size', TSHIRT_SIZES)
  out.motherName = text('motherName', "Mother's name", MAX_NAME)

  // Contact
  const phone = text('phone', 'Phone number', 40)
  if (phone) {
    const normalized = normalizePhone(phone)
    if (normalized.length < 9 || normalized.length > 15) {
      issues.push({ field: 'phone', message: 'Enter a valid phone number.' })
    } else {
      out.phone = normalized
    }
  }
  const email = text('personalEmail', 'Email address', 200)
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      issues.push({ field: 'personalEmail', message: 'Enter a valid email address.' })
    } else {
      out.email = email.toLowerCase()
    }
  }
  out.permanentAddress = text('permanentAddressKtp', 'Address on your KTP', MAX_ADDRESS)
  out.domicileAddress = text('domicileAddress', 'Current address', MAX_ADDRESS)

  // Emergency contact
  out.emergencyContactName = text('emergencyContactName', 'Emergency contact name', MAX_NAME)
  const emergencyPhone = text('emergencyContactPhone', 'Emergency contact phone', 40)
  if (emergencyPhone) {
    const normalized = normalizePhone(emergencyPhone)
    if (normalized.length < 9 || normalized.length > 15) {
      issues.push({ field: 'emergencyContactPhone', message: 'Enter a valid phone number.' })
    } else {
      out.emergencyContactPhone = normalized
    }
  }
  out.emergencyContactAddress = text('emergencyContactAddress', 'Emergency contact address', MAX_ADDRESS)
  const relationship = oneOf('emergencyContactRelationship', 'Relationship', EMERGENCY_CONTACT_RELATIONSHIPS)
  out.emergencyContactRelationship = relationship
  out.emergencyContactRelationshipOther =
    relationship === 'other' ? text('emergencyContactRelationshipOther', 'Relationship', MAX_NAME) : null

  // Identity — §11's exact digit rules.
  out.nationalId = numeric('nik', 'NIK', [16])
  out.taxNumber = numeric('npwp', 'NPWP', [15, 16])
  // BPJS is `followUp` tier on the onboarding checklist — it may arrive after
  // the hire starts, so requiring it here would block a submit over a card the
  // hire does not have yet.
  out.bpjsTk = numeric('bpjsTk', 'BPJS Ketenagakerjaan', [11, 13, 16], false) || null
  out.bpjsKesehatan = numeric('bpjsKesehatan', 'BPJS Kesehatan', [11, 13, 16], false) || null

  // Documents — §6: KTP and KK required, photo and supporting optional.
  out.ktpFileId = text('ktpFileId', 'KTP scan', 200)
  out.kkFileId = text('kkFileId', 'Family card (KK) scan', 200)
  out.photoFileId = text('photoFileId', 'Photo', 200, false) || null
  const supporting = Array.isArray(draft.supportingFileIds) ? (draft.supportingFileIds as unknown[]) : []
  out.supportingFileIds = supporting.filter((entry): entry is string => typeof entry === 'string').slice(0, MAX_SUPPORTING_FILES)

  // Financial — never merged into `out`; §10.4 keeps these off the main document.
  const bankAccountName = text('bankAccountName', 'Bank account name', MAX_NAME)
  const bankAccountNumber = numeric('bankAccountNumber', 'BCA account number', [10])

  // Drop the empty strings the helpers left behind for fields that already
  // reported an issue, so a partial write can never reach Firestore.
  for (const key of Object.keys(out)) {
    if (out[key] === '') delete out[key]
  }

  return {
    employeeUpdates: out,
    bank: { bankAccountName: bankAccountName.toUpperCase(), bankAccountNumber },
    issues,
  }
}
