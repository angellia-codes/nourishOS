import type { CandidateSource, CandidateStage } from './candidatePipelineDemoData'

export { formatIdr, formatRequisitionDate } from './employeeRequisitionFormat'

/** HR_OPERATIONS.md §9.4 "Recruitment Pipeline Stages" — board column order. */
export const CANDIDATE_STAGES: { code: CandidateStage; label: string }[] = [
  { code: 'ST-01', label: 'Applied' },
  { code: 'ST-02', label: 'Screening' },
  { code: 'ST-03', label: 'HR Interview' },
  { code: 'ST-04', label: 'User Interview' },
  { code: 'ST-05', label: 'Offering' },
  { code: 'ST-06', label: 'Hired' },
  { code: 'ST-07', label: 'Rejected' },
  { code: 'ST-08', label: 'Withdrawn' },
]

export const CANDIDATE_STAGE_LABELS: Record<CandidateStage, string> = CANDIDATE_STAGES.reduce(
  (acc, s) => ({ ...acc, [s.code]: s.label }),
  {} as Record<CandidateStage, string>,
)

export const CANDIDATE_STAGE_VARIANT: Record<CandidateStage, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  'ST-01': 'neutral',
  'ST-02': 'info',
  'ST-03': 'info',
  'ST-04': 'info',
  'ST-05': 'warning',
  'ST-06': 'success',
  'ST-07': 'error',
  'ST-08': 'neutral',
}

/** employment-application-form.md §2 — labels for the canonical recruitment-source superset. */
export const CANDIDATE_SOURCE_LABELS: Record<CandidateSource, string> = {
  jobPortal: 'Job Portal',
  referral: 'Referral',
  socialMedia: 'Social Media',
  broadcast: 'Broadcast',
  newspaperAd: 'Newspaper Ad',
  appliedDirectly: 'Applied Directly',
  otherAdvertisement: 'Other Advertisement',
  employmentAgency: 'Employment Agency',
  other: 'Other',
}

/** HR_OPERATIONS.md §9.5 "WhatsApp Recruitment Automation" — template auto-fired on stage change. */
export const STAGE_WA_TEMPLATE: Partial<Record<CandidateStage, string>> = {
  'ST-02': 'Initial Contact',
  'ST-03': 'Interview Invitation',
  'ST-04': 'Interview Invitation',
  'ST-05': 'Offer Notification',
  'ST-06': 'Join Date Confirmation',
  'ST-07': 'Rejection Message',
}
