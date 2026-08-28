import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { notifyUsersByRole } from '../../shared/notifications'
import { completeTaskInternal } from '../../shared/tasks'
import type { AuthedUser } from '../../lib'
import { createWorkOrderInternal } from '../../operations/workOrders'
import {
  APAR_CHECKLIST_ITEMS,
  nextInspectionDueAfter,
  overallResultFor,
  parseRoundReferenceId,
  validateInspectionItems,
  type InspectionItem,
} from './helpers'

const TERMINAL_TASK_STATUSES = ['completed', 'verified', 'closed', 'cancelled', 'archived']

const LABEL_BY_KEY = new Map(APAR_CHECKLIST_ITEMS.map((item) => [item.key, item.en]))

/**
 * fire-extinguisher.md §5.1 — one submission per unit, not per round. A
 * 14-unit round that only writes at the end loses everything on a dropped
 * connection, and the module ships without the D3 offline queue (§10), so
 * per-unit durability is the whole safety net.
 *
 * Remediation is never gated behind an approval (§2.5/§Kebijakan 3): a
 * `needsService` result raises the Work Order inside this call.
 */
export const submitAparInspection = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.APAR_INSPECT)

    const { roundTaskId, extinguisherId, remarks } = (request.data ?? {}) as {
      roundTaskId?: string
      extinguisherId?: string
      remarks?: string
    }
    if (!roundTaskId || !extinguisherId) {
      throw new AppError('invalid-argument', 'roundTaskId and extinguisherId are required.')
    }

    const taskRef = db.collection(COLLECTIONS.TASKS).doc(roundTaskId)
    const [taskSnap, unitSnap] = await Promise.all([
      taskRef.get(),
      db.collection(COLLECTIONS.FIRE_EXTINGUISHERS).doc(extinguisherId).get(),
    ])
    if (!taskSnap.exists) {
      throw new AppError('not-found', 'That inspection round no longer exists.')
    }
    const task = taskSnap.data()!
    if (TERMINAL_TASK_STATUSES.includes(task.taskStatus as string)) {
      throw new AppError('failed-precondition', `That round is already ${task.taskStatus as string}.`)
    }
    // The period comes from the round, never the wall clock — a round finished
    // on the 1st of the next month still files against the month it covers.
    const { outletId, periodMonth } = parseRoundReferenceId(task.referenceId)

    if (!unitSnap.exists) {
      throw new AppError('not-found', 'That extinguisher no longer exists.')
    }
    const unit = unitSnap.data()!
    if (unit.isArchived) {
      throw new AppError('failed-precondition', 'That extinguisher has been retired.')
    }
    if (unit.outletId !== outletId) {
      throw new AppError('failed-precondition', 'That extinguisher belongs to a different outlet than this round.')
    }

    const items = validateInspectionItems((request.data as { items?: unknown })?.items)
    await assertPhotosExist(items)

    const overallResult = overallResultFor(items)
    const failedForService = items.filter((item) => item.resolution === 'needsService')

    let workOrderId: string | null = null
    if (failedForService.length > 0) {
      const failedLabels = failedForService.map((item) => LABEL_BY_KEY.get(item.key) ?? item.key).join(', ')
      workOrderId = await createWorkOrderInternal(user, {
        title: `APAR ${unit.assetCode as string} — service required`,
        description: `${periodMonth} inspection failed: ${failedLabels}.\n${failedForService
          .map((item) => `• ${LABEL_BY_KEY.get(item.key) ?? item.key}: ${item.note ?? ''}`)
          .join('\n')}`,
        location: unit.locationLabel as string,
        priority: 'high',
        outletId,
        departmentId: unit.departmentId as string,
        assignedToRole: 'engineering',
      })
    }

    // §4.3's (extinguisherId, periodMonth) uniqueness, enforced by a
    // deterministic doc id plus .create() — no query, no index, and two guards
    // submitting the same unit at once cannot both win.
    const inspectionId = `${extinguisherId}__${periodMonth}`
    try {
      await db
        .collection(COLLECTIONS.FIRE_EXTINGUISHER_INSPECTIONS)
        .doc(inspectionId)
        .create({
          extinguisherId,
          assetCode: unit.assetCode, // denormalized, same reason patrolLogs carries checkpointName
          roundTaskId,
          outletId,
          periodMonth,
          inspectedByUid: user.uid,
          inspectedByName: user.displayName || null,
          inspectedAt: FieldValue.serverTimestamp(),
          items,
          overallResult,
          workOrderId,
          remarks: typeof remarks === 'string' && remarks.trim() ? remarks.trim() : null,
          ...newDocumentBaseFields(user.uid, overallResult),
        })
    } catch (error) {
      if ((error as { code?: number | string }).code === 6 || (error as { code?: string }).code === 'already-exists') {
        throw new AppError('already-exists', `${unit.assetCode as string} is already recorded for ${periodMonth}.`)
      }
      throw error
    }

    await unitSnap.ref.update({
      lastInspectedAt: FieldValue.serverTimestamp(),
      nextInspectionDue: nextInspectionDueAfter(periodMonth),
      // An expired or discharged unit is not quietly reactivated by a passing
      // inspection — only an active unit's status moves here.
      ...(failedForService.length > 0
        ? { status: 'needsService' }
        : unit.status === 'active'
          ? { status: 'active' }
          : {}),
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'FireExtinguisherInspected',
      category: 'Security',
      module: 'security',
      resourceType: 'fireExtinguisherInspection',
      resourceId: inspectionId,
      action: 'create',
      user,
      severity: overallResult === 'failNeedsService' ? 'high' : 'low',
      newValues: { assetCode: unit.assetCode, periodMonth, overallResult, workOrderId },
    })

    if (workOrderId) {
      const message = `${unit.assetCode as string} at ${unit.locationLabel as string} failed its ${periodMonth} inspection — work order raised.`
      await Promise.all([
        notifyUsersByRole({
          role: 'engineering',
          module: 'security',
          title: 'Fire Extinguisher Needs Service',
          message,
          referenceId: workOrderId,
          priority: 'high',
        }),
        notifyUsersByRole({
          role: 'outletManager',
          module: 'security',
          title: 'Fire Extinguisher Needs Service',
          message,
          referenceId: extinguisherId,
          priority: 'high',
        }),
      ])
    }

    const roundCompleted = await completeRoundIfDone(roundTaskId, outletId, periodMonth, user)

    return successResponse(
      { inspectionId, overallResult, workOrderId, roundCompleted },
      `${unit.assetCode as string} recorded.`,
    )
  } catch (error) {
    return handleError(error)
  }
})

/**
 * Every failure carries photo evidence (§4.6). The id is checked against the
 * `files` collection rather than trusted, because it is the one field the
 * client supplies that the audit record leans on later.
 */
async function assertPhotosExist(items: InspectionItem[]): Promise<void> {
  const photoIds = items.map((item) => item.photoFileId).filter((id): id is string => Boolean(id))
  const snaps = await Promise.all(photoIds.map((id) => db.collection(COLLECTIONS.FILES).doc(id).get()))
  if (snaps.some((snap) => !snap.exists)) {
    throw new AppError('invalid-argument', 'A failure photo failed to upload — retake it before submitting.')
  }
}

/**
 * §5.1 — the round auto-completes once every active unit in the outlet has a
 * record for the period. Both queries are equality-only, so Firestore serves
 * them from single-field indexes and neither needs a composite entry.
 */
async function completeRoundIfDone(
  taskId: string,
  outletId: string,
  periodMonth: string,
  actorUser: AuthedUser,
): Promise<boolean> {
  const [unitsSnap, inspectionsSnap] = await Promise.all([
    db
      .collection(COLLECTIONS.FIRE_EXTINGUISHERS)
      .where('outletId', '==', outletId)
      .where('isArchived', '==', false)
      .get(),
    db
      .collection(COLLECTIONS.FIRE_EXTINGUISHER_INSPECTIONS)
      .where('outletId', '==', outletId)
      .where('periodMonth', '==', periodMonth)
      .get(),
  ])

  if (unitsSnap.size === 0 || inspectionsSnap.size < unitsSnap.size) return false

  await completeTaskInternal({
    taskId,
    actorUser,
    comment: `All ${unitsSnap.size} units recorded for ${periodMonth}.`,
  })
  return true
}
