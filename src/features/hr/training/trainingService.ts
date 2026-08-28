import { callFunction } from '@/services/api'
import { getDocument, queryDocuments, subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Unsubscribe } from '@/services/firestore'
import type {
  Department,
  Training,
  TrainingAssessmentResult,
  TrainingAssignment,
  TrainingBinding,
  TrainingTopic,
} from '@/types'

export interface SeedTrainingCatalogResult {
  departments: { created: number; skipped: number }
  topics: { created: number; skipped: number }
  bindings: { created: number; skipped: number }
}

/** Idempotent — re-running only fills in rows added to the seed since the last run. */
export function seedTrainingCatalog(): Promise<SeedTrainingCatalogResult> {
  return callFunction('seedTrainingCatalog', {})
}

export interface GenerateTrainingAssignmentsResult {
  results: { employeeId: string; trainingDepartmentId: string | null; assigned: number; locked: number; skipped: number }[]
  assigned: number
  locked: number
}

/** Backfill route — hire and transfer issue assignments server-side without this. */
export function generateTrainingAssignments(input: {
  employeeId?: string
  departmentId?: string
}): Promise<GenerateTrainingAssignmentsResult> {
  return callFunction('generateTrainingAssignments', input)
}

export function verifyTrainingCompletion(input: {
  assignmentId: string
  assessment: Pick<TrainingAssessmentResult, 'passed'> & { score?: number | null; notes?: string | null }
}): Promise<{ assignmentId: string; unlocked: number }> {
  return callFunction('verifyTrainingCompletion', input)
}

export function overrideTrainingGate(assignmentId: string, reason: string): Promise<{ assignmentId: string }> {
  return callFunction('overrideTrainingGate', { assignmentId, reason })
}

/** The 11 seeded departments, in sheet order. */
export function subscribeToTrainingDepartments(
  onChange: (departments: Department[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<Department>(COLLECTIONS.DEPARTMENTS, [orderBy('sortOrder', 'asc')], onChange, onError)
}

/** All 197 topics in one read — the same "small catalogue, one subscription" call the inventory item master makes. */
export function subscribeToTrainingTopics(
  onChange: (topics: TrainingTopic[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<TrainingTopic>(COLLECTIONS.TRAINING_TOPICS, [], onChange, onError)
}

export function getTrainingTopics(): Promise<TrainingTopic[]> {
  return queryDocuments<TrainingTopic>(COLLECTIONS.TRAINING_TOPICS, [])
}

/** One department's delivery sequence (composite index: departmentId + sequence). */
export function getBindingsForDepartment(trainingDepartmentId: string): Promise<TrainingBinding[]> {
  return queryDocuments<TrainingBinding>(COLLECTIONS.TRAINING_BINDINGS, [
    where('departmentId', '==', trainingDepartmentId),
    orderBy('sequence', 'asc'),
  ])
}

export function getAllBindings(): Promise<TrainingBinding[]> {
  return queryDocuments<TrainingBinding>(COLLECTIONS.TRAINING_BINDINGS, [])
}

/** A trainee's own queue. Sorted client-side so no index is needed beyond the automatic single-field one. */
export function subscribeToMyAssignments(
  employeeUid: string,
  onChange: (assignments: TrainingAssignment[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<TrainingAssignment>(
    COLLECTIONS.TRAINING_ASSIGNMENTS,
    [where('employeeUid', '==', employeeUid)],
    onChange,
    onError,
  )
}

export function subscribeToAssignmentsForEmployee(
  employeeId: string,
  onChange: (assignments: TrainingAssignment[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<TrainingAssignment>(
    COLLECTIONS.TRAINING_ASSIGNMENTS,
    [where('employeeId', '==', employeeId)],
    onChange,
    onError,
  )
}

/** The manager's verification queue — their own department, filtered to open rows client-side. */
export function subscribeToAssignmentsForDepartment(
  departmentId: string,
  onChange: (assignments: TrainingAssignment[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<TrainingAssignment>(
    COLLECTIONS.TRAINING_ASSIGNMENTS,
    [where('departmentId', '==', departmentId)],
    onChange,
    onError,
  )
}

/** Full ledger, for the Training Hours report. Same scale reasoning as subscribeToAllStockMovements. */
export function subscribeToAllTrainingAssignments(
  onChange: (assignments: TrainingAssignment[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<TrainingAssignment>(COLLECTIONS.TRAINING_ASSIGNMENTS, [], onChange, onError)
}

/** Legacy catalogue — read-only, so the Training Hours report can still price pre-2026-08-26 assignments. */
export function subscribeToLegacyTrainings(
  onChange: (trainings: Training[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<Training>(COLLECTIONS.TRAININGS, [], onChange, onError)
}

export function getTrainingTopic(topicId: string): Promise<TrainingTopic | null> {
  return getDocument<TrainingTopic>(COLLECTIONS.TRAINING_TOPICS, topicId)
}
