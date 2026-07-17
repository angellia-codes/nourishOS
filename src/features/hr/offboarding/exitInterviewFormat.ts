import type { ExitReason, IntendedTenure, JoinReason, RatingSection } from './exitInterviewDemoData'

export { CANDIDATE_SOURCE_LABELS as RECRUITMENT_SOURCE_LABELS } from '@/features/hr/recruitment/candidatePipelineFormat'

export const JOIN_REASON_LABELS: Record<JoinReason, string> = {
  establishedCompany: 'Established company',
  companyReputation: 'Company reputation',
  friendReferral: 'Friend referral',
  careerOpportunity: 'Career opportunity',
  salaryIncrease: 'Salary increase',
  trainingProgram: 'Training program',
  other: 'Other',
}

export const EXIT_REASON_LABELS: Record<ExitReason, string> = {
  personal: 'Personal reasons',
  continuingStudy: 'Continuing study',
  health: 'Health',
  relocation: 'Relocation',
  transportationTooFar: 'Transportation / too far',
  resignedWithoutNotice: 'Resigned without notice',
  anotherJobSameIndustry: 'Another job — same industry',
  anotherJobDifferentIndustry: 'Another job — different industry',
  notReturningFromLeave: 'Not returning from leave',
  pension: 'Pension',
  contractExpiration: 'Contract expiration',
  other: 'Other',
}

export const INTENDED_TENURE_LABELS: Record<IntendedTenure, string> = {
  '0-3m': '0–3 months',
  '4-6m': '4–6 months',
  '6-9m': '6–9 months',
  '12m': 'Up to 12 months',
  '2y': 'Up to 2 years',
  '>2y': 'More than 2 years',
}

export const RATING_SECTION_LABELS: Record<RatingSection, string> = {
  company: 'Section H — The Company',
  manager: 'Section I — Your Manager',
  culture: 'Section J — Culture',
}

/** F009 rating scale: 1 = Sangat Buruk/Very Bad … 4 = Sangat Baik/Very Good. */
export const RATING_SCALE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: '1 — Sangat Buruk / Very Bad',
  2: '2 — Buruk / Bad',
  3: '3 — Baik / Good',
  4: '4 — Sangat Baik / Very Good',
}
