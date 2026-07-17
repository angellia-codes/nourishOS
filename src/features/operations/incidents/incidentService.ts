import { orderBy, where } from 'firebase/firestore'
import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Priority } from '@/constants/statuses'
import type { IncidentPerson, IncidentReport, IncidentStatus, IncidentType, IncidentWitness } from '@/types'
import type { Unsubscribe } from 'firebase/firestore'

export interface CreateIncidentReportInput {
  title: string
  description: string
  incidentType: IncidentType
  severity: Priority
  location: string
  occurredAt: string
  peopleInvolved?: IncidentPerson[]
  witnesses?: IncidentWitness[]
  immediateActionTaken: string
  emergencyServicesCalled?: boolean
}

export interface CreateIncidentReportResult {
  incidentId: string
  incidentNumber: string
  linkedWorkOrderId: string | null
}

export function createIncidentReport(input: CreateIncidentReportInput): Promise<CreateIncidentReportResult> {
  return callFunction('createIncidentReport', input)
}

export interface UpdateIncidentStatusInput {
  incidentId: string
  status: IncidentStatus
  resolutionSummary?: string
}

export function updateIncidentStatus(input: UpdateIncidentStatusInput): Promise<{ incidentId: string }> {
  return callFunction('updateIncidentStatus', input)
}

export function reopenIncident(incidentId: string, reason: string): Promise<{ incidentId: string }> {
  return callFunction('reopenIncident', { incidentId, reason })
}

export function getIncidentReport(incidentId: string): Promise<IncidentReport | null> {
  return getDocument<IncidentReport>(COLLECTIONS.INCIDENT_REPORTS, incidentId)
}

export function subscribeToIncidentReports(onChange: (incidents: IncidentReport[]) => void): Unsubscribe {
  return subscribeToCollection<IncidentReport>(
    COLLECTIONS.INCIDENT_REPORTS,
    [where('isArchived', '==', false), orderBy('createdAt', 'desc')],
    onChange,
  )
}
