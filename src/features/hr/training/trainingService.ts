import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Unsubscribe } from '@/services/firestore'
import type { Training, TrainingAssignment } from '@/types'
import type { TrainingType } from '@/constants/hr'

export interface TrainingInput {
  title: string
  type: TrainingType
  description?: string
  mandatory: boolean
}

export function createTraining(input: TrainingInput): Promise<{ trainingId: string }> {
  return callFunction('createTraining', input)
}

export interface UpdateTrainingInput {
  trainingId: string
  title?: string
  type?: TrainingType
  description?: string
  mandatory?: boolean
  isArchived?: boolean
}

export function updateTraining(input: UpdateTrainingInput): Promise<{ trainingId: string }> {
  return callFunction('updateTraining', input)
}

export function assignTraining(input: {
  trainingId: string
  employeeIds: string[]
  dueDate?: string
}): Promise<{ assignmentIds: string[] }> {
  return callFunction('assignTraining', input)
}

export function completeTraining(assignmentId: string): Promise<{ assignmentId: string }> {
  return callFunction('completeTraining', { assignmentId })
}

export function getTraining(trainingId: string): Promise<Training | null> {
  return getDocument<Training>(COLLECTIONS.TRAININGS, trainingId)
}

/** Full catalog, unfiltered — same "small org, one subscription" convention as subscribeToInventoryItems. */
export function subscribeToTrainings(
  onChange: (trainings: Training[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<Training>(COLLECTIONS.TRAININGS, [orderBy('title', 'asc')], onChange, onError)
}

export function subscribeToAssignmentsForTraining(
  trainingId: string,
  onChange: (assignments: TrainingAssignment[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<TrainingAssignment>(
    COLLECTIONS.TRAINING_ASSIGNMENTS,
    [where('trainingId', '==', trainingId), orderBy('createdAt', 'desc')],
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
    [where('employeeId', '==', employeeId), orderBy('createdAt', 'desc')],
    onChange,
    onError,
  )
}
