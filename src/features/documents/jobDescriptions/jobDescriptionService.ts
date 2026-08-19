import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Unsubscribe } from '@/services/firestore'
import type { JobDescription, JobDescriptionAccess } from '@/types'
import type { Role } from '@/constants/roles'

/** The singleton doc id inside systemSettings that firestore.rules reads. */
export const ACCESS_DOC_ID = 'jobDescriptionAccess'

export interface JobDescriptionInput {
  departmentId: string
  roleId: Role
  title: string
  pdfUrl: string
  notes?: string | null
}

export function createJobDescription(input: JobDescriptionInput): Promise<{ jobDescriptionId: string }> {
  return callFunction('createJobDescription', input)
}

export function updateJobDescription(
  input: JobDescriptionInput & { jobDescriptionId: string },
): Promise<{ jobDescriptionId: string }> {
  return callFunction('updateJobDescription', input)
}

export function deleteJobDescription(jobDescriptionId: string): Promise<{ jobDescriptionId: string }> {
  return callFunction('deleteJobDescription', { jobDescriptionId })
}

export function setJobDescriptionAccess(roleIds: Role[]): Promise<{ roleIds: Role[] }> {
  return callFunction('setJobDescriptionAccess', { roleIds })
}

export function getJobDescription(jobDescriptionId: string): Promise<JobDescription | null> {
  return getDocument<JobDescription>(COLLECTIONS.JOB_DESCRIPTIONS, jobDescriptionId)
}

/**
 * Live register, ordered so the list groups cleanly by department without a
 * client-side sort. Backed by the jobDescriptions composite index.
 */
export function subscribeToJobDescriptions(
  onChange: (rows: JobDescription[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<JobDescription>(
    COLLECTIONS.JOB_DESCRIPTIONS,
    [where('isArchived', '==', false), orderBy('departmentId'), orderBy('roleId')],
    onChange,
    onError,
  )
}

export function getJobDescriptionAccess(): Promise<JobDescriptionAccess | null> {
  return getDocument<JobDescriptionAccess>(COLLECTIONS.SYSTEM_SETTINGS, ACCESS_DOC_ID)
}
