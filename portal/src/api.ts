import { callFunction } from './firebase'

/** The portal's whole surface area — every callable in functions/src/recruitment/portal/. */

export interface OpenPosition {
  requisitionId: string
  position: string
  positionLabel: string
  outletId: string
  departmentId: string
  employmentType: string
  workSchedule: string | null
  responsibilities: string | null
  requirements: string | null
}

export function listOpenPositions(): Promise<{ positions: OpenPosition[] }> {
  return callFunction('listOpenPositions')
}

export function startApplication(input: {
  requisitionId: string
  fullName: string
  phone: string
  email?: string
  source: string
}): Promise<{ candidateId: string; candidateNumber: string; applicationToken: string; position: string }> {
  return callFunction('startApplication', input)
}

export function saveApplicationForm(
  applicationToken: string,
  form: Record<string, unknown>,
): Promise<{ candidateId: string; missing: string[] }> {
  return callFunction('saveApplicationForm', { applicationToken, form })
}

export function uploadCandidateDocument(input: {
  applicationToken: string
  documentType: string
  fileName: string
  mimeType: string
  contentBase64: string
}): Promise<{ fileId: string; documentType: string; fileName: string }> {
  return callFunction('uploadCandidateDocument', input)
}

export interface DiscQuestion {
  id: string
  prompt: string
  /** Indonesian, rendered under the English line — see functions/src/recruitment/portal/discQuestions.ts. */
  promptId: string
  options: { id: string; text: string; textId: string }[]
}

export function getDiscQuestions(): Promise<{ questions: DiscQuestion[] }> {
  return callFunction('getDiscQuestions')
}

export function submitDiscAssessment(
  applicationToken: string,
  responses: { questionId: string; answer: string }[],
): Promise<{ candidateId: string; completedAt: string }> {
  return callFunction('submitDiscAssessment', { applicationToken, responses })
}

export function completeApplication(applicationToken: string): Promise<{ candidateId: string; currentStage: string }> {
  return callFunction('completeApplication', { applicationToken })
}

export interface ApplicationStatus {
  candidateNumber: string
  fullName: string
  position: string
  stage: string
  stageLabel: string
  stageIndex: number
  stages: { stage: string; label: string }[]
  closed: boolean
  submittedAt: string | null
  steps: { form: boolean; disc: boolean; cv: boolean }
  missing: string[]
  documents: { documentType: string; fileName: string }[]
  applicationForm: Record<string, unknown> | null
}

export function getApplicationStatus(applicationToken: string): Promise<ApplicationStatus> {
  return callFunction('getApplicationStatus', { applicationToken })
}

/** Reads a File as bare base64 (no data: prefix) for uploadCandidateDocument. */
export function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}
