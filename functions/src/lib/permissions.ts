/**
 * Known duplication (see collections.ts) — mirrors the subset of
 * src/constants/permissions.ts actually checked by Cloud Functions.
 */
export const PERMISSIONS = {
  APPRAISALS_CREATE: 'appraisals.create',
  APPRAISALS_SUBMIT: 'appraisals.submit',
  APPRAISALS_GENERATE_INSIGHTS: 'appraisals.generateInsights',
  APPRAISALS_MANAGE_TEMPLATES: 'appraisals.manageTemplates',
  PATROLS_CREATE: 'security.create',
  CHECKPOINTS_MANAGE: 'security.manageCheckpoints',
} as const
