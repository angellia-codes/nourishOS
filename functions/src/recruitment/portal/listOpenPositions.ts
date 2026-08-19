import { onCall } from 'firebase-functions/v2/https'
import { db, COLLECTIONS, REGION, handleError, successResponse } from '../../lib'
import { POSITION_LABELS } from '../../lib/positions'

/**
 * candidate_portal.md §15 Screen 2 — the public vacancy list.
 *
 * Unauthenticated: `firestore.rules` keeps `recruitments` closed to the
 * public, so the portal cannot read requisitions directly. This callable is
 * the one narrow window onto them, and it projects hard — the requester,
 * justification, headcount and everything under `recruitments/{id}/confidential`
 * stay inside NourishOS.
 */
export const listOpenPositions = onCall({ region: REGION }, async () => {
  try {
    const snap = await db
      .collection(COLLECTIONS.RECRUITMENTS)
      .where('status', '==', 'approved')
      .where('vacancyStage', 'in', ['open', 'offering'])
      .limit(100)
      .get()

    const positions = snap.docs.map((doc) => {
      const data = doc.data()
      return {
        requisitionId: doc.id,
        position: data.position as string,
        positionLabel: POSITION_LABELS[data.position as string] ?? (data.position as string),
        outletId: data.outletId as string,
        departmentId: data.departmentId as string,
        employmentType: data.employmentType as string,
        workSchedule: (data.workSchedule as string | null) ?? null,
        responsibilities: (data.responsibilities as string | null) ?? null,
        requirements: (data.requirements as string | null) ?? null,
      }
    })

    positions.sort((a, b) => a.positionLabel.localeCompare(b.positionLabel))

    return successResponse({ positions }, `${positions.length} open position(s).`)
  } catch (error) {
    return handleError(error)
  }
})
