import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { submitApprovalInternal } from '../../shared/approval'
import type { Bilingual, PositionLevel, PositionResponsibility } from './types'

/** Content fields HR can propose changing — appraisalScorerPositionId (setAppraisalScorer) and isActive (archivePosition) are deliberately excluded, each its own narrower callable. */
export interface UpdatePositionInput {
  positionId: string
  title?: Bilingual
  divisionId?: string | null
  jobOverview?: Bilingual
  keyResponsibilities?: PositionResponsibility[]
  authority?: Bilingual[]
  workingRelationships?: { internal: Bilingual[]; external: Bilingual[] }
  qualifications?: {
    education: Bilingual
    experience: Bilingual
    certification: Bilingual
    language: Bilingual
    computerSkills: Bilingual
  }
  knowledge?: Bilingual[]
  skills?: { soft: Bilingual[]; hard: Bilingual[] }
  competencies?: Bilingual[]
  performanceExpectations?: Bilingual
  supervisesPositionIds?: string[]
  supervisesNote?: Bilingual | null
  positionStatus?: 'draft' | 'active'
  effectiveDate?: string | null
  level?: PositionLevel
  departmentId?: string
}

const EDITABLE_FIELDS = [
  'title',
  'divisionId',
  'jobOverview',
  'keyResponsibilities',
  'authority',
  'workingRelationships',
  'qualifications',
  'knowledge',
  'skills',
  'competencies',
  'performanceExpectations',
  'supervisesPositionIds',
  'supervisesNote',
  'positionStatus',
  'effectiveDate',
  'level',
  'departmentId',
] as const

/**
 * Stages a content edit rather than applying it directly — the approval-
 * resolved handler (index.ts) is what merges `pendingChanges` onto the live
 * fields, increments `revision`, and emits `PositionRevised` (§8.1/§8.2), so
 * a position edit only takes effect once HR Manager → Department Head → GM
 * have all cleared it. `responsibilityId` stability (§2.3) is the caller's
 * responsibility: editing text keeps the id, a genuinely new responsibility
 * gets a new one, removal sets isRemoved rather than splicing.
 */
export const updatePosition = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.POSITIONS_UPDATE)

    const input = (request.data ?? {}) as Partial<UpdatePositionInput>
    if (!input.positionId?.trim()) {
      throw new AppError('invalid-argument', 'positionId is required.')
    }

    const changes: Record<string, unknown> = {}
    for (const field of EDITABLE_FIELDS) {
      if (input[field] !== undefined) changes[field] = input[field]
    }
    if (Object.keys(changes).length === 0) {
      throw new AppError('invalid-argument', 'At least one editable field must be provided.')
    }

    const ref = db.collection(COLLECTIONS.POSITIONS).doc(input.positionId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Position not found.')
    }
    const position = snap.data()!
    if (position.status === 'pending') {
      throw new AppError('failed-precondition', 'This position already has an edit awaiting approval.')
    }

    await ref.update({ pendingChanges: changes, status: 'pending', ...updatedFields(user.uid) })

    const approvalRequestId = await submitApprovalInternal({
      module: 'hr',
      resourceType: 'position',
      resourceId: input.positionId,
      requestedBy: user.uid,
      context: { departmentId: position.departmentId as string, requesterRoleId: user.roleId },
    })
    await ref.update({ approvalRequestId })

    await recordAuditEvent({
      eventType: 'PositionEditProposed',
      category: 'HR',
      module: 'hr',
      resourceType: 'position',
      resourceId: input.positionId,
      action: 'update',
      user,
      newValues: changes,
    })

    return successResponse(undefined, 'Edit submitted for HR Manager, Department Head, and GM approval.')
  } catch (error) {
    handleError(error)
  }
})
