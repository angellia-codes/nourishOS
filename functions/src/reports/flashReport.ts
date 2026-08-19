import { onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import {
  db,
  COLLECTIONS,
  REGION,
  PERMISSIONS,
  BUSINESS_TIME_ZONE,
  requireActiveUser,
  requirePermission,
  addDaysIso,
  todayIso,
  handleError,
  successResponse,
} from '../lib'
import { FONNTE_TOKEN } from '../lib/secrets'
import { notifyUsersByRole } from '../shared/notifications'

/**
 * GM Flash Report — HR_OPERATIONS.md Epic E12-US01 and §9.12-F09's "Weekly
 * Executive Report auto-generated every Monday".
 *
 * One aggregation function serving both entry points the epic asks for: the
 * Monday 07:00 schedule, and the manual trigger from the Reports module. The
 * numbers are counted server-side rather than in the page because the GM's
 * WhatsApp summary needs them with no browser involved.
 *
 * Counting strategy: `count()` aggregations where a plain equality filter is
 * enough (no documents fetched), and a single fetch only where the value has to
 * be derived from fields Firestore can't aggregate on — escalation levels and
 * daily-update compliance.
 */

const CLOSED_TASK_STATUSES = ['completed', 'verified', 'closed', 'cancelled', 'archived']
const LEADER_ROLES = ['kitchenLeader', 'barLeader', 'floorLeader', 'bakeryLeader', 'wholefoodLeader', 'outletManager']

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

export async function buildFlashReport(): Promise<FlashReport> {
  const today = todayIso()
  const weekAgo = addDaysIso(-7)
  const in30Days = addDaysIso(30)

  const [
    activeHeadcount,
    newHires,
    openRequisitions,
    activeProjects,
    contractsDue,
    probationsDue,
    tasksSnap,
    reportsSnap,
    leadersSnap,
  ] = await Promise.all([
    db.collection(COLLECTIONS.EMPLOYEES).where('status', '==', 'active').count().get(),
    db
      .collection(COLLECTIONS.EMPLOYEES)
      .where('status', '==', 'active')
      .where('joinDate', '>=', weekAgo)
      .count()
      .get(),
    db.collection(COLLECTIONS.RECRUITMENTS).where('vacancyStage', '==', 'open').count().get(),
    db.collection(COLLECTIONS.PROJECTS).where('status', '==', 'active').count().get(),
    db
      .collection(COLLECTIONS.EMPLOYEES)
      .where('status', '==', 'active')
      .where('contractEndDate', '<=', in30Days)
      .count()
      .get(),
    db
      .collection(COLLECTIONS.EMPLOYEES)
      .where('status', '==', 'active')
      .where('probationEndDate', '<=', in30Days)
      .count()
      .get(),
    // Escalation level and open/closed both live on the task doc but neither is
    // an equality filter that count() can serve, so this one is a real fetch.
    db.collection(COLLECTIONS.TASKS).where('tags', 'array-contains', 'dailyUpdate').get(),
    db.collection(COLLECTIONS.DAILY_REPORTS).where('date', '==', today).get(),
    db.collection(COLLECTIONS.USERS).where('roleId', 'in', LEADER_ROLES).where('status', '==', 'active').get(),
  ])

  let openIssueCount = 0
  let escalatedTaskCount = 0
  for (const doc of tasksSnap.docs) {
    const task = doc.data()
    if (CLOSED_TASK_STATUSES.includes(task.taskStatus as string)) continue
    openIssueCount += 1
    if (((task.escalationLevel as number | undefined) ?? 0) >= 3) escalatedTaskCount += 1
  }

  const departmentsExpected = new Set(
    leadersSnap.docs
      .map((doc) => `${doc.data().outletId}::${doc.data().departmentId}`)
      .filter((key) => !key.includes('undefined')),
  ).size

  return {
    generatedFor: today,
    activeHeadcount: activeHeadcount.data().count,
    newHiresLast7Days: newHires.data().count,
    openRequisitions: openRequisitions.data().count,
    activeProjects: activeProjects.data().count,
    escalatedTaskCount,
    openIssueCount,
    contractsDueIn30Days: contractsDue.data().count,
    probationsDueIn30Days: probationsDue.data().count,
    departmentsReportedToday: reportsSnap.size,
    departmentsExpected,
  }
}

/** The WhatsApp/in-app body — E12-US01's "headcount summary, open positions, escalated issues, projects, contracts due". */
export function formatFlashReport(report: FlashReport): string {
  return [
    `Week of ${report.generatedFor}`,
    `Headcount: ${report.activeHeadcount} active (${report.newHiresLast7Days} new in 7 days)`,
    `Recruitment: ${report.openRequisitions} open requisition(s)`,
    `Projects: ${report.activeProjects} active`,
    `Issues: ${report.openIssueCount} open, ${report.escalatedTaskCount} escalated 5+ days`,
    `Contracts due in 30 days: ${report.contractsDueIn30Days} · Probations: ${report.probationsDueIn30Days}`,
    `Daily updates today: ${report.departmentsReportedToday}/${report.departmentsExpected} departments`,
  ].join('\n')
}

/** E12-US01: every Monday at 07:00, to the GM and HR Manager, with no manual prep. */
export const sendFlashReport = onSchedule(
  { schedule: '0 7 * * 1', timeZone: BUSINESS_TIME_ZONE, region: REGION, secrets: [FONNTE_TOKEN] },
  async () => {
    const report = await buildFlashReport()
    const message = formatFlashReport(report)

    await Promise.all(
      ['generalManager', 'hrManager'].map((role) =>
        notifyUsersByRole({
          role,
          module: 'reports',
          title: 'GM Flash Report',
          message,
          priority: 'informational',
          whatsapp: true,
        }),
      ),
    )
  },
)

/** E12-US01's "HR Admin can manually trigger the report at any time via the Reports module". */
export const generateFlashReport = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.REPORTS_READ)

    const report = await buildFlashReport()
    return successResponse({ report }, 'Flash report generated.')
  } catch (error) {
    handleError(error)
  }
})
