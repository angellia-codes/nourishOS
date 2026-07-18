import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { sendNotificationInternal, notifyUsersByRole } from '../../shared/notifications'
import { ACK_PARTIES, entitledParty, type AckParty } from './helpers'

interface AckEntry {
  party: AckParty
  acknowledgedAt: unknown
  acknowledgedBy: string | null
}

// employee-disciplinary-action.md §5 — records one party's acknowledgment.
// Runs in a transaction so two parties signing at once can't clobber each
// other; once all four are recorded it auto-finalizes (AC-3) and refreshes the
// employee's denormalized active-disciplinary snapshot.
export const acknowledgeDisciplinaryAction = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.DISCIPLINARY_ACKNOWLEDGE)

    const { actionId, party } = (request.data ?? {}) as { actionId?: string; party?: AckParty }
    if (!actionId) {
      throw new AppError('invalid-argument', 'actionId is required.')
    }
    if (!party || !ACK_PARTIES.includes(party)) {
      throw new AppError('invalid-argument', 'A valid acknowledgment party is required.')
    }

    const actionRef = db.collection(COLLECTIONS.DISCIPLINARY_ACTIONS).doc(actionId)

    // Need the subject employee's email to authorize the 'employee' party.
    const preSnap = await actionRef.get()
    if (!preSnap.exists) {
      throw new AppError('not-found', 'Disciplinary action not found.')
    }
    const employeeSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(preSnap.data()!.employeeId).get()
    const employeeEmail = (employeeSnap.data()?.email as string | undefined) ?? ''

    if (!entitledParty(party, user, { departmentId: preSnap.data()!.departmentId }, { email: employeeEmail })) {
      throw new AppError('permission-denied', `You are not authorized to acknowledge as the ${party} party.`)
    }

    const finalized = await db.runTransaction(async (tx) => {
      const snap = await tx.get(actionRef)
      const action = snap.data()!
      if (action.status !== 'underReview') {
        throw new AppError('failed-precondition', `This disciplinary action is ${action.status}, not awaiting acknowledgment.`)
      }
      const acks = action.acknowledgments as AckEntry[]
      const entry = acks.find((a) => a.party === party)
      if (!entry) {
        throw new AppError('failed-precondition', `No ${party} acknowledgment slot on this action.`)
      }
      if (entry.acknowledgedAt) {
        throw new AppError('failed-precondition', `The ${party} party has already acknowledged this action.`)
      }

      const updatedAcks = acks.map((a) =>
        a.party === party ? { ...a, acknowledgedAt: FieldValue.serverTimestamp(), acknowledgedBy: user.uid } : a,
      )
      const allSigned = updatedAcks.every((a) => a.party === party || a.acknowledgedAt)

      tx.update(actionRef, {
        acknowledgments: updatedAcks,
        status: allSigned ? 'finalized' : 'underReview',
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: user.uid,
      })
      return allSigned
    })

    await recordAuditEvent({
      eventType: 'DisciplinaryActionAcknowledged',
      category: 'HR',
      module: 'disciplinary',
      resourceType: 'disciplinaryAction',
      resourceId: actionId,
      action: 'acknowledge',
      user,
      newValues: { party, finalized },
    })

    if (finalized) {
      const action = (await actionRef.get()).data()!
      // Denormalized active-disciplinary snapshot on the employee (§3) — a thin
      // summary; disciplinaryActions remains the source of truth. Cleared when
      // the record expires (checkDisciplinaryExpiry).
      await db.collection(COLLECTIONS.EMPLOYEES).doc(action.employeeId).update({
        disciplinaryType: action.disciplinaryType,
        disciplinaryStartPeriod: action.validFrom,
        disciplinaryEndPeriod: action.validUntil,
        activeDisciplinaryActionId: actionId,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: 'system:disciplinary',
      })

      await recordAuditEvent({
        eventType: 'DisciplinaryActionFinalized',
        category: 'HR',
        module: 'disciplinary',
        resourceType: 'disciplinaryAction',
        resourceId: actionId,
        action: 'finalize',
        user,
        newValues: { disciplinaryType: action.disciplinaryType, validUntil: action.validUntil },
      })

      // §7 — notify Employee, Department Head, HR Manager on finalization.
      await notifyUsersByRole({
        role: 'hrManager',
        module: 'disciplinary',
        title: 'Disciplinary Action Finalized',
        message: `${action.actionNumber} for ${action.employeeName} is fully acknowledged and finalized.`,
        referenceId: actionId,
      })
      if (employeeEmail) {
        const match = await db.collection(COLLECTIONS.USERS).where('email', '==', employeeEmail).limit(1).get()
        if (!match.empty) {
          await sendNotificationInternal({
            type: 'alert',
            title: 'Disciplinary Action Finalized',
            message: `${action.actionNumber} concerning you is now finalized, valid until ${action.validUntil}.`,
            module: 'disciplinary',
            priority: 'high',
            recipientUid: match.docs[0].id,
            referenceModule: 'disciplinary',
            referenceId: actionId,
          })
        }
      }
    }

    return successResponse({ actionId, finalized }, finalized ? 'Acknowledged — action finalized.' : 'Acknowledgment recorded.')
  } catch (error) {
    handleError(error)
  }
})
