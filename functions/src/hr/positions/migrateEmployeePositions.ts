import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'

const BATCH_SIZE = 400

/**
 * §9 — employee.position -> employee.positionId. Not fuzzy text matching:
 * `employee.position` is already a validated PositionId (2026-08-17 pass),
 * so this is a straight copy plus a validation pass confirming a seeded
 * `positions/{positionId}` doc exists for the value. Idempotent (skips
 * employees that already carry a matching positionId) and re-runnable.
 * Employees whose `position` doesn't resolve to any seeded position are
 * reported, never dropped — `legacyPositionText` is not needed since
 * `position` itself is retained untouched either way.
 */
export const migrateEmployeePositions = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.POSITIONS_SEED)

    const [employeesSnap, positionsSnap] = await Promise.all([
      db.collection(COLLECTIONS.EMPLOYEES).get(),
      db.collection(COLLECTIONS.POSITIONS).select().get(),
    ])
    const validPositionIds = new Set(positionsSnap.docs.map((doc) => doc.id))

    let migrated = 0
    let alreadyDone = 0
    const unmatched: { employeeId: string; fullName: string; position: string }[] = []

    const pending = employeesSnap.docs.filter((doc) => {
      const data = doc.data()
      const position = data.position as string | undefined
      if (!position) return false
      if (data.positionId === position) {
        alreadyDone += 1
        return false
      }
      if (!validPositionIds.has(position)) {
        unmatched.push({
          employeeId: doc.id,
          fullName: (data.fullName as string | undefined) ?? doc.id,
          position,
        })
        return false
      }
      return true
    })

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = db.batch()
      for (const doc of pending.slice(i, i + BATCH_SIZE)) {
        batch.update(doc.ref, { positionId: doc.data().position as string, ...updatedFields(user.uid) })
      }
      await batch.commit()
      migrated += Math.min(BATCH_SIZE, pending.length - i)
    }

    await recordAuditEvent({
      eventType: 'EmployeePositionsMigrated',
      category: 'HR',
      module: 'hr',
      resourceType: 'employee',
      resourceId: 'migration',
      action: 'update',
      user,
      metadata: { migrated, alreadyDone, unmatchedCount: unmatched.length },
    })

    return successResponse(
      { migrated, alreadyDone, unmatched },
      `Migrated ${migrated} employee(s), ${alreadyDone} already done, ${unmatched.length} unmatched (needs manual HR resolution).`,
    )
  } catch (error) {
    handleError(error)
  }
})
