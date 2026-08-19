import { callFunction } from '@/services/api'

/** Mirrors functions/src/reports/flashReport.ts's FlashReport. */
export interface FlashReport {
  generatedFor: string
  activeHeadcount: number
  newHiresLast7Days: number
  openRequisitions: number
  activeProjects: number
  escalatedTaskCount: number
  openIssueCount: number
  contractsDueIn30Days: number
  probationsDueIn30Days: number
  departmentsReportedToday: number
  departmentsExpected: number
}

/**
 * HR_OPERATIONS.md E12-US01's manual trigger. A callable rather than a
 * client-side aggregation like the ten HR reports: the same numbers go out on
 * the Monday 07:00 WhatsApp with no browser involved, so the counting lives
 * server-side and both entry points share it.
 */
export function generateFlashReport(): Promise<{ report: FlashReport }> {
  return callFunction('generateFlashReport', {})
}
