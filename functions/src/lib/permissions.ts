/**
 * Known duplication (see collections.ts) — mirrors the subset of
 * src/constants/permissions.ts actually checked by Cloud Functions.
 */
export const PERMISSIONS = {
  EMPLOYEES_CREATE: 'employees.create',
  EMPLOYEES_UPDATE: 'employees.update',
  EMPLOYEES_DELETE: 'employees.delete',
  APPRAISALS_CREATE: 'appraisals.create',
  APPRAISALS_SUBMIT: 'appraisals.submit',
  APPRAISALS_GENERATE_INSIGHTS: 'appraisals.generateInsights',
  APPRAISALS_MANAGE_TEMPLATES: 'appraisals.manageTemplates',
  PATROLS_CREATE: 'security.create',
  CHECKPOINTS_MANAGE: 'security.manageCheckpoints',
  LOST_FOUND_CREATE: 'lostFound.create',
  LOST_FOUND_MANAGE: 'lostFound.manage',
  INCIDENTS_CREATE: 'incidents.create',
  INCIDENTS_MANAGE: 'incidents.manage',
  DAILY_UPDATES_SUBMIT: 'dailyUpdates.submit',
} as const
