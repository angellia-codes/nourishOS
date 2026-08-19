import { AppError } from '../../lib'

/** Mirrors src/constants/hr.ts TRAINING_TYPE (known frontend/functions duplication — keep in sync). */
export const TRAINING_TYPES = ['sop', 'safety', 'foodSafety', 'customerService', 'leadership', 'technical'] as const
export type TrainingType = (typeof TRAINING_TYPES)[number]

export function validateTrainingType(value: unknown): TrainingType {
  if (typeof value !== 'string' || !TRAINING_TYPES.includes(value as TrainingType)) {
    throw new AppError('invalid-argument', `type must be one of: ${TRAINING_TYPES.join(', ')}.`)
  }
  return value as TrainingType
}
