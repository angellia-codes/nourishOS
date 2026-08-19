/**
 * Exit Interview (Digitized F009) — exit-interview.md.
 *
 * §3's Sections H/I/J rating items (12 company + 14 manager + 6 culture) are
 * placeholders: the source F009 docx with the real bilingual wording wasn't
 * available when this shipped (confirmed with the user). Swapping in the
 * real item text is a data-only change to this file — no schema/code change,
 * since `itemKey`/`itemLabel` are just strings on `ExitInterviewRating`.
 * Mirrored server-side in functions/src/hr/employees/exitInterview.ts (known
 * duplication, same convention as every other client/functions constant pair).
 */

export const JOIN_REASONS = [
  'establishedCompany',
  'companyReputation',
  'friendReferral',
  'careerOpportunity',
  'salaryIncrease',
  'trainingProgram',
  'other',
] as const

export const JOIN_REASON_LABELS: Record<(typeof JOIN_REASONS)[number], string> = {
  establishedCompany: 'Established company',
  companyReputation: 'Company reputation',
  friendReferral: 'Friend/family referral',
  careerOpportunity: 'Career opportunity',
  salaryIncrease: 'Salary increase',
  trainingProgram: 'Training program',
  other: 'Other',
}

export const EXIT_REASONS = [
  'personal',
  'continuingStudy',
  'health',
  'relocation',
  'transportationTooFar',
  'resignedWithoutNotice',
  'anotherJobSameIndustry',
  'anotherJobDifferentIndustry',
  'notReturningFromLeave',
  'pension',
  'contractExpiration',
  'other',
] as const

export const EXIT_REASON_LABELS: Record<(typeof EXIT_REASONS)[number], string> = {
  personal: 'Personal reasons',
  continuingStudy: 'Continuing study',
  health: 'Health',
  relocation: 'Relocation',
  transportationTooFar: 'Transportation too far',
  resignedWithoutNotice: 'Resigned without notice',
  anotherJobSameIndustry: 'Another job, same industry',
  anotherJobDifferentIndustry: 'Another job, different industry',
  notReturningFromLeave: 'Not returning from leave',
  pension: 'Pension',
  contractExpiration: 'Contract expiration',
  other: 'Other',
}

export const INTENDED_TENURES = ['0-3m', '4-6m', '6-9m', '12m', '2y', '>2y'] as const

export const INTENDED_TENURE_LABELS: Record<(typeof INTENDED_TENURES)[number], string> = {
  '0-3m': '0–3 months',
  '4-6m': '4–6 months',
  '6-9m': '6–9 months',
  '12m': '12 months',
  '2y': '2 years',
  '>2y': 'More than 2 years',
}

export interface ExitInterviewRatingItemDef {
  section: 'company' | 'manager' | 'culture'
  itemKey: string
  itemLabel: string
}

/** 12 company + 14 manager + 6 culture = 32, matching F009's item count. */
export const EXIT_INTERVIEW_RATING_ITEMS: readonly ExitInterviewRatingItemDef[] = [
  // Section H — Company (12)
  { section: 'company', itemKey: 'seniorManagement', itemLabel: 'Senior management' },
  { section: 'company', itemKey: 'companyDirection', itemLabel: 'Company direction and vision' },
  { section: 'company', itemKey: 'companyReputation', itemLabel: 'Company reputation' },
  { section: 'company', itemKey: 'workEnvironment', itemLabel: 'Physical work environment' },
  { section: 'company', itemKey: 'compensationFairness', itemLabel: 'Pay fairness' },
  { section: 'company', itemKey: 'benefitsSatisfaction', itemLabel: 'Benefits' },
  { section: 'company', itemKey: 'workLifeBalance', itemLabel: 'Work-life balance' },
  { section: 'company', itemKey: 'careerGrowth', itemLabel: 'Career growth opportunities' },
  { section: 'company', itemKey: 'trainingOpportunities', itemLabel: 'Training opportunities' },
  { section: 'company', itemKey: 'jobSecurity', itemLabel: 'Job security' },
  { section: 'company', itemKey: 'companyPolicies', itemLabel: 'Company policies' },
  { section: 'company', itemKey: 'overallCompany', itemLabel: 'Overall satisfaction with the company' },

  // Section I — Manager (14)
  { section: 'manager', itemKey: 'managerCommunication', itemLabel: 'My manager communicated clearly' },
  { section: 'manager', itemKey: 'managerFeedback', itemLabel: 'My manager gave useful feedback' },
  { section: 'manager', itemKey: 'managerFairness', itemLabel: 'My manager treated me fairly' },
  { section: 'manager', itemKey: 'managerSupport', itemLabel: 'My manager supported my development' },
  { section: 'manager', itemKey: 'managerAvailability', itemLabel: 'My manager was available when needed' },
  { section: 'manager', itemKey: 'managerRecognition', itemLabel: 'My manager recognized good work' },
  { section: 'manager', itemKey: 'managerConflictHandling', itemLabel: 'My manager handled conflicts well' },
  { section: 'manager', itemKey: 'managerDelegation', itemLabel: 'My manager delegated tasks clearly' },
  { section: 'manager', itemKey: 'managerListening', itemLabel: 'My manager listened to concerns' },
  { section: 'manager', itemKey: 'managerConsistency', itemLabel: 'My manager was consistent' },
  { section: 'manager', itemKey: 'managerRespect', itemLabel: 'My manager treated me with respect' },
  { section: 'manager', itemKey: 'managerGoalSetting', itemLabel: 'My manager set clear goals' },
  { section: 'manager', itemKey: 'managerTeamMorale', itemLabel: 'My manager kept team morale up' },
  { section: 'manager', itemKey: 'overallManager', itemLabel: 'Overall satisfaction with my manager' },

  // Section J — Culture (6)
  { section: 'culture', itemKey: 'teamCollaboration', itemLabel: 'Team collaboration' },
  { section: 'culture', itemKey: 'companyValues', itemLabel: 'Alignment with company values' },
  { section: 'culture', itemKey: 'inclusivity', itemLabel: 'Inclusivity and respect among colleagues' },
  { section: 'culture', itemKey: 'communicationCulture', itemLabel: 'Openness of communication across the company' },
  { section: 'culture', itemKey: 'changeManagement', itemLabel: 'How well the company handles change' },
  { section: 'culture', itemKey: 'overallCulture', itemLabel: 'Overall satisfaction with company culture' },
]
