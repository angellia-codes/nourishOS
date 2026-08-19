import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import {
  db,
  COLLECTIONS,
  REGION,
  BUSINESS_TIME_ZONE,
  addDaysIso,
  recordAuditEvent,
  type AuthedUser,
} from '../../lib'
import { notifyUsersByRole } from '../../shared/notifications'

/** §29 — "For records expiring soon: 30 days, 14 days, 7 days, 1 day." */
const REMINDER_THRESHOLDS = [30, 14, 7, 1]

const SYSTEM_USER: AuthedUser = {
  uid: 'system:communicationExpiry',
  email: null,
  displayName: 'System (Communication Expiry)',
  roleId: 'system',
  departmentId: null,
  outletId: null,
  permissions: [],
}

/**
 * Automated Expiry — employee_communication.md §29, at 08:00 WITA.
 *
 * Stateless by design, the same shape as contractAlerts.ts: each threshold day
 * matches exactly once as time moves forward, so an exact-day-match query is
 * its own dedup and there is no `sentFlags` map to keep consistent.
 *
 * A record only reaches `active` with a non-null `validUntil` through
 * acknowledgeCommunicationRecord, so the query never has to reason about the
 * types that have no validity window (coaching, termination) or about legacy
 * `open` records that predate the workflow — neither is `active`.
 *
 * In-app notifications only; WhatsApp for disciplinary expiry was not in scope,
 * so this declares no `secrets: [FONNTE_TOKEN]`.
 */
export const expireCommunicationRecords = onSchedule(
  { schedule: '0 8 * * *', timeZone: BUSINESS_TIME_ZONE, region: REGION },
  async () => {
    await expireDueRecords()
    for (const threshold of REMINDER_THRESHOLDS) {
      await remindForThreshold(threshold)
    }
  },
)

/** §29's main path: validUntil is today → status becomes expired, audited, HR told. */
async function expireDueRecords(): Promise<void> {
  const today = addDaysIso(0)
  const snap = await db
    .collection(COLLECTIONS.DISCIPLINARY_ACTIONS)
    .where('status', '==', 'active')
    .where('validUntil', '==', today)
    .get()

  for (const doc of snap.docs) {
    const record = doc.data()
    try {
      await doc.ref.update({
        status: 'expired',
        updatedAt: new Date(),
        updatedBy: SYSTEM_USER.uid,
      })

      await recordAuditEvent({
        eventType: 'CommunicationExpired',
        category: 'HR',
        module: 'hr',
        resourceType: 'disciplinaryRecord',
        resourceId: doc.id,
        action: 'update',
        user: SYSTEM_USER,
        previousValues: { status: 'active' },
        newValues: { status: 'expired', validUntil: today },
      })

      await notifyUsersByRole({
        role: 'hrManager',
        module: 'hr',
        priority: 'medium',
        title: 'Warning Expired',
        message: `${describe(record)} expired today — ${today}. It no longer counts toward the next disciplinary step.`,
        referenceId: doc.id,
      })
    } catch (error) {
      logger.error(`Failed to expire communication record ${doc.id}`, error)
    }
  }
}

/** §29's reminder path: notify only, no status change. */
async function remindForThreshold(daysAhead: number): Promise<void> {
  const targetDate = addDaysIso(daysAhead)
  const snap = await db
    .collection(COLLECTIONS.DISCIPLINARY_ACTIONS)
    .where('status', '==', 'active')
    .where('validUntil', '==', targetDate)
    .get()

  for (const doc of snap.docs) {
    try {
      await notifyUsersByRole({
        role: 'hrManager',
        module: 'hr',
        priority: daysAhead <= 7 ? 'high' : 'medium',
        title: 'Warning Expiring',
        message: `${describe(doc.data())} expires in ${daysAhead} day${daysAhead === 1 ? '' : 's'} — ${targetDate}.`,
        referenceId: doc.id,
      })
    } catch (error) {
      logger.error(`Failed to send expiry reminder for communication record ${doc.id} at ${daysAhead}d`, error)
    }
  }
}

function describe(record: Record<string, unknown>): string {
  const name = (record.employeeName as string | null) ?? 'An employee'
  const number = record.employeeNumber as string | null
  return `${record.type as string} for ${name}${number ? ` (${number})` : ''}`
}
