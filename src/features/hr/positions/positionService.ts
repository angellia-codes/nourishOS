import { callFunction } from '@/services/api'
import { getDocument, queryDocuments, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Position, Bilingual, PositionLevel, PositionResponsibility } from '@/types'

export function getPosition(positionId: string): Promise<Position | null> {
  return getDocument<Position>(COLLECTIONS.POSITIONS, positionId)
}

/** Full catalog, unfiltered — same "small org, one subscription" convention as trainingService. */
export function listPositions(): Promise<Position[]> {
  return queryDocuments<Position>(COLLECTIONS.POSITIONS, [orderBy('title.en', 'asc')])
}

export interface CreatePositionInput {
  positionId: string
  title: Bilingual
  departmentId: string
  level: PositionLevel
  isAppraisable: boolean
}

export function createPosition(input: CreatePositionInput): Promise<{ positionId: string }> {
  return callFunction('createPosition', input)
}

export interface UpdatePositionInput {
  positionId: string
  title?: Bilingual
  jobOverview?: Bilingual
  keyResponsibilities?: PositionResponsibility[]
  supervisesPositionIds?: string[]
  positionStatus?: 'draft' | 'active'
}

export function updatePosition(input: UpdatePositionInput): Promise<void> {
  return callFunction('updatePosition', input)
}

export function archivePosition(positionId: string): Promise<void> {
  return callFunction('archivePosition', { positionId })
}

export function setAppraisalScorer(positionId: string, appraisalScorerPositionId: string | null): Promise<void> {
  return callFunction('setAppraisalScorer', { positionId, appraisalScorerPositionId })
}
