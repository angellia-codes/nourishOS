import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { submitApprovalInternal } from '../../shared/approval'
import type { Bilingual, PositionLevel } from './types'

const EMPTY_BILINGUAL: Bilingual = { en: '', id: '' }
const VALID_LEVELS: PositionLevel[] = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']

export interface CreatePositionInput {
  positionId: string
  title: Bilingual
  departmentId: string
  level: PositionLevel
  isAppraisable: boolean
  jobOverview?: Bilingual
}

/**
 * A genuinely new position, post-launch — the ~66-position ladder is already
 * covered by seedPositions. Routes through the same HR Manager → Department
 * Head → GM chain as a JD document's own printed approval line
 * (POSITIONS_MASTER_DESIGN.md §8.1). Ships `positionStatus: 'draft'`,
 * `appraisalScorerPositionId: null` — HR fills content and assigns a scorer
 * (setAppraisalScorer) once it clears approval.
 */
export const createPosition = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.POSITIONS_CREATE)

    const input = (request.data ?? {}) as Partial<CreatePositionInput>
    if (!input.positionId?.trim() || !input.title?.en?.trim() || !input.departmentId?.trim()) {
      throw new AppError('invalid-argument', 'positionId, title, and departmentId are required.')
    }
    if (!input.level || !VALID_LEVELS.includes(input.level)) {
      throw new AppError('invalid-argument', `level must be one of: ${VALID_LEVELS.join(', ')}.`)
    }

    const positionId = input.positionId.trim()
    const ref = db.collection(COLLECTIONS.POSITIONS).doc(positionId)
    const existing = await ref.get()
    if (existing.exists) {
      throw new AppError('already-exists', `A position with id "${positionId}" already exists.`)
    }

    await ref.set({
      positionId,
      title: input.title,
      departmentId: input.departmentId,
      divisionId: null,
      level: input.level,
      appraisalScorerPositionId: null,
      isAppraisable: input.isAppraisable ?? true,
      jobOverview: input.jobOverview ?? EMPTY_BILINGUAL,
      keyResponsibilities: [],
      authority: [],
      workingRelationships: { internal: [], external: [] },
      qualifications: {
        education: EMPTY_BILINGUAL,
        experience: EMPTY_BILINGUAL,
        certification: EMPTY_BILINGUAL,
        language: EMPTY_BILINGUAL,
        computerSkills: EMPTY_BILINGUAL,
      },
      knowledge: [],
      skills: { soft: [], hard: [] },
      competencies: [],
      performanceExpectations: EMPTY_BILINGUAL,
      supervisesPositionIds: [],
      supervisesNote: null,
      positionStatus: 'draft',
      revision: 1,
      effectiveDate: null,
      sourceFileId: null,
      isActive: true,
      outletId: null,
      ...newDocumentBaseFields(user.uid, 'pending'),
    })

    const approvalRequestId = await submitApprovalInternal({
      module: 'hr',
      resourceType: 'position',
      resourceId: positionId,
      requestedBy: user.uid,
      context: { departmentId: input.departmentId, requesterRoleId: user.roleId },
    })
    await ref.update({ approvalRequestId })

    await recordAuditEvent({
      eventType: 'PositionCreated',
      category: 'HR',
      module: 'hr',
      resourceType: 'position',
      resourceId: positionId,
      action: 'create',
      user,
      newValues: { title: input.title, departmentId: input.departmentId, level: input.level },
    })

    return successResponse({ positionId }, 'Position submitted for HR Manager, Department Head, and GM approval.')
  } catch (error) {
    handleError(error)
  }
})
