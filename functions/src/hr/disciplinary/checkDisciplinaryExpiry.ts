import { onSchedule } from 'firebase-functions/v2/scheduler'
import { FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, REGION } from '../../lib'
import { notifyUsersByRole } from '../../shared/notifications'

/**
 * employee-disciplinary-action.md §5/§7 — runs daily. Finalized records past
 * validUntil move to `expired` (AC-4); if the record was the employee's active
 * one, the denormalized snapshot is cleared. HR is notified once (on the
 * expiry transition itself, so it can't repeat).
 *
 * ponytail: the §7 "expiring soon, 14 days out" pre-warning is deferred —
 * one fire-once expiry notice covers the operational need; add a second
 * `expiryWarnedAt`-guarded branch here if the pre-warning proves necessary.
 */
export const checkDisciplinaryExpiry = onSchedule({ schedule: 'every day 08:00', region: REGION }, async () => {
  const today = new Date().toISOString().slice(0, 10)
  const snap = await db.collection(COLLECTIONS.DISCIPLINARY_ACTIONS).where('status', '==', 'finalized').get()

  for (const doc of snap.docs) {
    const action = doc.data()
    if (action.validUntil > today) continue

    try {
      await doc.ref.update({ status: 'expired', updatedAt: FieldValue.serverTimestamp(), updatedBy: 'system:disciplinary' })

      // Clear the employee's denormalized snapshot only if THIS record is the
      // active one (a newer action may have superseded it).
      const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc(action.employeeId)
      const employeeSnap = await employeeRef.get()
      if (employeeSnap.data()?.activeDisciplinaryActionId === doc.id) {
        await employeeRef.update({
          disciplinaryType: null,
          disciplinaryStartPeriod: null,
          disciplinaryEndPeriod: null,
          activeDisciplinaryActionId: null,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: 'system:disciplinary',
        })
      }

      await notifyUsersByRole({
        role: 'hrManager',
        module: 'disciplinary',
        title: 'Disciplinary Action Expired',
        message: `${action.actionNumber} for ${action.employeeName} has passed its validity (${action.validUntil}) and is now expired.`,
        referenceId: doc.id,
      })
    } catch (error) {
      logger.error(`Failed to expire disciplinary action ${doc.id}`, error)
    }
  }
})
