// exit-interview.md §3 — F009 digitized. recruitmentSource reuses the canonical
// superset owned by the recruitment demo module (employment-application-form.md §2).
export type { RecruitmentSource } from '../recruitment/candidatePipelineDemoData'

export type JoinReason =
  | 'establishedCompany'
  | 'companyReputation'
  | 'friendReferral'
  | 'careerOpportunity'
  | 'salaryIncrease'
  | 'trainingProgram'
  | 'other'

export type ExitReason =
  | 'personal'
  | 'continuingStudy'
  | 'health'
  | 'relocation'
  | 'transportationTooFar'
  | 'resignedWithoutNotice'
  | 'anotherJobSameIndustry'
  | 'anotherJobDifferentIndustry'
  | 'notReturningFromLeave'
  | 'pension'
  | 'contractExpiration'
  | 'other'

export type IntendedTenure = '0-3m' | '4-6m' | '6-9m' | '12m' | '2y' | '>2y'

export type RatingSection = 'company' | 'manager' | 'culture'

export interface RatingItem {
  section: RatingSection
  itemKey: string
  itemLabel: string
}

/**
 * Representative subset of F009's ~32 rated items (12 company / 14 manager /
 * 6 culture) — enough to preview the three-block 1–4 rating structure; the
 * full bilingual question set comes from the F009 docx at build time.
 */
export const RATING_ITEMS: RatingItem[] = [
  { section: 'company', itemKey: 'seniorManagement', itemLabel: 'Confidence in senior management' },
  { section: 'company', itemKey: 'workingConditions', itemLabel: 'Working conditions & facilities' },
  { section: 'company', itemKey: 'compensationFairness', itemLabel: 'Fairness of pay & benefits' },
  { section: 'company', itemKey: 'careerDevelopment', itemLabel: 'Career development opportunities' },
  { section: 'company', itemKey: 'internalCommunication', itemLabel: 'Internal communication' },
  { section: 'manager', itemKey: 'careAboutYou', itemLabel: 'Cared about you as a person' },
  { section: 'manager', itemKey: 'clearExpectations', itemLabel: 'Set clear expectations' },
  { section: 'manager', itemKey: 'feedback', itemLabel: 'Gave useful, regular feedback' },
  { section: 'manager', itemKey: 'fairTreatment', itemLabel: 'Treated everyone fairly' },
  { section: 'manager', itemKey: 'recognition', itemLabel: 'Recognized good work' },
  { section: 'manager', itemKey: 'listened', itemLabel: 'Listened to concerns and ideas' },
  { section: 'culture', itemKey: 'teamwork', itemLabel: 'Teamwork across departments' },
  { section: 'culture', itemKey: 'respect', itemLabel: 'Culture of respect' },
  { section: 'culture', itemKey: 'workLifeBalance', itemLabel: 'Work–life balance' },
]

/** Departing employees eligible for an exit interview — mirrors MOCK_OFFBOARDING_CHECKLISTS. */
export const EXIT_INTERVIEW_EMPLOYEES = [
  { id: 'off-1', name: 'Gede Arya Wibawa', employeeNumber: 'N-0005', position: 'Outlet Leader' },
  { id: 'off-2', name: 'Made Dwi Lestari', employeeNumber: 'N-0006', position: 'Waiter' },
  { id: 'off-3', name: 'Komang Yuda Pratama', employeeNumber: 'N-0007', position: 'Finance Staff' },
]
