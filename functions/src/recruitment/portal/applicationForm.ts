import { AppError } from '../../lib'
import { portalIsoDate, portalText } from './guard'

/**
 * F010 Employment Application Form — employment-application-form.md §4.
 *
 * Two deliberate choices here:
 *
 * 1. Presence is *not* enforced at save time, shape is. The portal is a
 *    multi-step wizard and saves as the candidate goes, so a half-filled form
 *    is a legitimate state; `completeApplication` is where "is this actually
 *    finished" gets decided (§7 AC-1). What is enforced on every save is type,
 *    length and row count — those are the injection/DoS surface.
 * 2. The health, criminal-record and previous-salary answers (§3) are split
 *    out into a separate object the caller writes to
 *    `candidates/{id}/confidential/application`, mirroring the shipped
 *    `recruitments/{id}/confidential/*` pattern, because `firestore.rules`
 *    cannot gate individual fields of a document.
 */

const MAX_ROWS = 12
const PROFICIENCIES = ['excellent', 'good', 'basic'] as const
const GENDERS = ['male', 'female'] as const
const ENVIRONMENTS = ['office', 'field'] as const
const MARITAL_STATUSES = ['single', 'married', 'widowed'] as const
const RELIGIONS = ['hindu', 'christian', 'catholic', 'islam'] as const
const BUSINESS_TYPES = ['foodAndBeverage', 'hospitality', 'retail'] as const

type Row = Record<string, unknown>

function rows(value: unknown, label: string): Row[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new AppError('invalid-argument', `${label} must be a list.`)
  if (value.length > MAX_ROWS) {
    throw new AppError('invalid-argument', `${label}: at most ${MAX_ROWS} entries.`)
  }
  return value.map((row) => (row && typeof row === 'object' ? (row as Row) : {}))
}

function optionalOneOf<T extends string>(value: unknown, allowed: readonly T[], label: string): T | null {
  if (value === undefined || value === null || value === '') return null
  if (!allowed.includes(value as T)) {
    throw new AppError('invalid-argument', `${label} must be one of: ${allowed.join(', ')}.`)
  }
  return value as T
}

function bool(value: unknown): boolean {
  return value === true
}

/** portalIsoDate has no "blank is OK" mode (unlike portalText's `required` flag) — work-experience dates are optional. */
function optionalIsoDate(value: unknown, label: string): string {
  return typeof value === 'string' && value.trim() ? portalIsoDate(value, label, true) : ''
}

export interface ParsedApplicationForm {
  form: Record<string, unknown>
  sensitive: Record<string, unknown>
}

export function parseApplicationForm(input: Record<string, unknown>): ParsedApplicationForm {
  const personal = (input.personalData ?? {}) as Row
  const address = (input.address ?? {}) as Row
  const additional = (input.additionalQuestions ?? {}) as Row
  const sensitiveInput = (input.sensitiveResponses ?? {}) as Row

  const workExperience = rows(input.workExperience, 'Work experience').map((row) => ({
    companyName: portalText(row.companyName, 'Company name', 160, false),
    companyType: optionalOneOf(row.companyType, BUSINESS_TYPES, 'Type of business'),
    periodStart: optionalIsoDate(row.periodStart, 'Period start'),
    periodEnd: optionalIsoDate(row.periodEnd, 'Period end'),
    position: portalText(row.position, 'Position', 120, false),
    reasonForResignation: portalText(row.reasonForResignation, 'Reason for leaving', 500, false),
  }))

  // §3: previous salary never sits on the readable document.
  const workExperienceSalaries = rows(input.workExperience, 'Work experience').map((row, index) => ({
    index,
    companyName: portalText(row.companyName, 'Company name', 160, false),
    salary: typeof row.salary === 'number' && Number.isFinite(row.salary) && row.salary >= 0 ? row.salary : null,
  }))

  const form: Record<string, unknown> = {
    personalData: {
      fullName: portalText(personal.fullName, 'Full name', 120, false),
      gender: optionalOneOf(personal.gender, GENDERS, 'Gender'),
      placeOfBirth: portalText(personal.placeOfBirth, 'Place of birth', 120, false),
      dateOfBirth: personal.dateOfBirth ? portalIsoDate(personal.dateOfBirth, 'Date of birth', true) : null,
      nationality: portalText(personal.nationality, 'Nationality', 60, false),
      maritalStatus: optionalOneOf(personal.maritalStatus, MARITAL_STATUSES, 'Marital status'),
      religion: optionalOneOf(personal.religion, RELIGIONS, 'Religion'),
      email: portalText(personal.email, 'Email', 200, false),
      phone: portalText(personal.phone, 'Phone', 40, false),
    },
    address: {
      permanentAddress: portalText(address.permanentAddress, 'Permanent address', 500, false),
      domicileAddress: portalText(address.domicileAddress, 'Domicile address', 500, false),
    },
    formalEducation: rows(input.formalEducation, 'Formal education').map(educationRow),
    informalEducation: rows(input.informalEducation, 'Informal education').map(educationRow),
    training: rows(input.training, 'Training').map((row) => ({
      name: portalText(row.name, 'Training name', 160, false),
      organizerLocation: portalText(row.organizerLocation, 'Organizer/location', 160, false),
      monthYear: portalText(row.monthYear, 'Month/year', 20, false),
    })),
    languages: rows(input.languages, 'Languages').map((row) => ({
      language: portalText(row.language, 'Language', 60, false),
      speaking: optionalOneOf(row.speaking, PROFICIENCIES, 'Speaking'),
      reading: optionalOneOf(row.reading, PROFICIENCIES, 'Reading'),
      writing: optionalOneOf(row.writing, PROFICIENCIES, 'Writing'),
    })),
    workExperience,
    additionalQuestions: {
      knowsAboutCompany: portalText(additional.knowsAboutCompany, 'What you know about us', 2000, false),
      expectationsIfHired: portalText(additional.expectationsIfHired, 'Expectations', 2000, false),
      willingToRelocate: bool(additional.willingToRelocate),
      willingToTravel: bool(additional.willingToTravel),
      preferredEnvironment: optionalOneOf(additional.preferredEnvironment, ENVIRONMENTS, 'Preferred environment'),
      strengths: threeAnswers(additional.strengths, 'Strengths'),
      weaknesses: threeAnswers(additional.weaknesses, 'Weaknesses'),
      willingToAttachReferenceLetter: bool(additional.willingToAttachReferenceLetter),
      referenceLetterDeclineReason: portalText(
        additional.referenceLetterDeclineReason,
        'Reason for not attaching a reference letter',
        500,
        false,
      ),
      expectedRemuneration: portalText(additional.expectedRemuneration, 'Expected remuneration', 120, false),
    },
    references: rows(input.references, 'References').map((row) => ({
      name: portalText(row.name, 'Reference name', 120, false),
      phone: portalText(row.phone, 'Reference phone', 40, false),
      company: portalText(row.company, 'Reference company', 160, false),
      department: portalText(row.department, 'Reference department', 120, false),
      position: portalText(row.position, 'Reference position', 120, false),
      relationship: portalText(row.relationship, 'Relationship', 120, false),
    })),
    declarationAccepted: bool(input.declarationAccepted),
    declarationAcceptedAt: bool(input.declarationAccepted) ? new Date().toISOString() : null,
  }

  const sensitive: Record<string, unknown> = {
    seriousIllnessHistory: bool(sensitiveInput.seriousIllnessHistory),
    seriousIllnessDetail: portalText(sensitiveInput.seriousIllnessDetail, 'Illness detail', 1000, false),
    criminalHistory: bool(sensitiveInput.criminalHistory),
    criminalHistoryDetail: portalText(sensitiveInput.criminalHistoryDetail, 'Criminal record detail', 1000, false),
    workExperienceSalaries,
  }

  return { form, sensitive }
}

function educationRow(row: Row): Record<string, unknown> {
  return {
    schoolType: portalText(row.schoolType, 'School type', 120, false),
    institutionName: portalText(row.institutionName, 'Institution', 160, false),
    city: portalText(row.city, 'City', 120, false),
    major: portalText(row.major, 'Major', 120, false),
    graduationYear: portalText(row.graduationYear, 'Graduation year', 10, false),
  }
}

/** The paper form asks for exactly three; blanks are kept so row 3 stays row 3. */
function threeAnswers(value: unknown, label: string): string[] {
  const list = Array.isArray(value) ? value : []
  return [0, 1, 2].map((i) => portalText(list[i], `${label} ${i + 1}`, 200, false))
}

/**
 * The completeness gate — §7 AC-1/AC-3. Kept next to the parser so "what the
 * form is" and "when it counts as finished" cannot drift apart.
 */
export function missingRequiredSections(form: Record<string, unknown>): string[] {
  const missing: string[] = []
  const personal = (form.personalData ?? {}) as Row
  const address = (form.address ?? {}) as Row

  if (!personal.fullName || !personal.dateOfBirth || !personal.placeOfBirth || !personal.gender || !personal.phone) {
    missing.push('Personal information')
  }
  if (!address.permanentAddress) missing.push('Address')
  // A row exists as soon as the page renders, so presence of a row proves
  // nothing — an institution name is the smallest thing that means "filled in".
  const education = Array.isArray(form.formalEducation) ? (form.formalEducation as Row[]) : []
  if (!education.some((row) => row.institutionName)) missing.push('Formal education')
  if (form.declarationAccepted !== true) missing.push('Declaration')

  return missing
}
