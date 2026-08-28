import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import {
  db,
  COLLECTIONS,
  REGION,
  BUSINESS_TIME_ZONE,
  addDaysIso,
  todayIso,
  recordAuditEvent,
  updatedFields,
  type AuthedUser,
} from '../../lib'
import { notifyUsersByRole } from '../../shared/notifications'

/** §4.7 — a unit expiring next month passes all six checks, so expiry is monitored off the register, not the checklist. */
const THRESHOLDS = [90, 30, 7]

const DATE_FIELDS = [
  { field: 'expiryDate', label: 'expires' },
  { field: 'nextHydrostaticTestDate', label: 'is due for its hydrostatic test' },
] as const

const SYSTEM_USER: AuthedUser = {
  uid: 'system:aparExpiry',
  email: null,
  displayName: 'System (APAR Expiry)',
  roleId: 'system',
  departmentId: null,
  outletId: null,
  permissions: [],
  employeeId: null,
}

/**
 * fire-extinguisher.md §4.7 — alerts at T-90/T-30/T-7 on both the expiry and
 * hydrostatic-test dates, and at T-0 the unit flips to `expired` and stops
 * counting as coverage.
 *
 * Stateless like contractAlerts: each threshold day passes exactly once as time
 * moves forward, so an exact-day match is its own dedup and no `sentFlags` map
 * is needed. The status flip is guarded on the current status instead, since
 * that one has to happen once and stay.
 */
export const checkAparExpiry = onSchedule(
  { schedule: '30 6 * * *', timeZone: BUSINESS_TIME_ZONE, region: REGION },
  async () => {
    const today = todayIso()
    const thresholdDates = new Map(THRESHOLDS.map((days) => [addDaysIso(days), days]))

    const snap = await db.collection(COLLECTIONS.FIRE_EXTINGUISHERS).where('isArchived', '==', false).get()

    for (const doc of snap.docs) {
      const unit = doc.data()
      try {
        for (const { field, label } of DATE_FIELDS) {
          const value = unit[field] as string | null
          if (!value) continue

          const days = thresholdDates.get(value)
          if (days !== undefined) {
            await notifyOutlet(doc.id, unit, {
              title: days <= 30 ? 'Fire Extinguisher Expiring Soon' : 'Fire Extinguisher Expiry Approaching',
              message: `${unit.assetCode as string} at ${unit.locationLabel as string} ${label} in ${days} days — ${value}.`,
              priority: days <= 30 ? 'high' : 'medium',
            })
          }
        }

        const expiryDate = unit.expiryDate as string | null
        if (expiryDate && expiryDate <= today && unit.status !== 'expired') {
          await doc.ref.update({ status: 'expired', ...updatedFields(SYSTEM_USER.uid) })

          const message = `${unit.assetCode as string} at ${unit.locationLabel as string} expired on ${expiryDate} and no longer counts as coverage.`
          await notifyOutlet(doc.id, unit, { title: 'Fire Extinguisher Expired', message, priority: 'critical' })
          await notifyUsersByRole({
            role: 'generalManager',
            module: 'security',
            title: 'Fire Extinguisher Expired',
            message,
            referenceId: doc.id,
            priority: 'critical',
          })

          await recordAuditEvent({
            eventType: 'FireExtinguisherExpired',
            category: 'Security',
            module: 'security',
            resourceType: 'fireExtinguisher',
            resourceId: doc.id,
            action: 'update',
            user: SYSTEM_USER,
            severity: 'critical',
            previousValues: { status: unit.status },
            newValues: { status: 'expired', expiryDate },
          })
        }
      } catch (error) {
        logger.error(`APAR expiry sweep failed for ${doc.id}`, error)
      }
    }
  },
)

/** §8 — the outlet owner and the party who services the unit, on every alert. */
async function notifyOutlet(
  extinguisherId: string,
  unit: FirebaseFirestore.DocumentData,
  input: { title: string; message: string; priority: 'critical' | 'high' | 'medium' },
): Promise<void> {
  await Promise.all(
    ['outletManager', 'engineering'].map((role) =>
      notifyUsersByRole({
        role,
        module: 'security',
        title: input.title,
        message: `${input.message} (${unit.outletId as string})`,
        referenceId: extinguisherId,
        priority: input.priority,
      }),
    ),
  )
}
