import type { Priority } from '@/constants/statuses'
import type { IncidentStatus, IncidentType } from './incidentDemoData'

/** "15 Jul 2026, 18:45" from a stored ISO datetime. */
export function formatIncidentDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  customerComplaint: 'Customer Complaint',
  foodSafety: 'Food Safety',
  workplaceInjury: 'Workplace Injury',
  equipmentFailure: 'Equipment Failure',
  theft: 'Theft',
  securityIncident: 'Security Incident',
  utilityFailure: 'Utility Failure',
  nearMiss: 'Near Miss',
}

/** incident-report.md §5 status lifecycle. */
export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Reported',
  underReview: 'Under Review',
  investigating: 'Investigating',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
}

export const INCIDENT_STATUS_VARIANT: Record<IncidentStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  reported: 'info',
  underReview: 'warning',
  investigating: 'warning',
  resolved: 'success',
  closed: 'neutral',
  reopened: 'error',
}

export const INCIDENT_SEVERITY_LABELS: Record<Priority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const INCIDENT_SEVERITY_VARIANT: Record<Priority, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'neutral',
}

/** Forward transition per incident-report.md §8 updateIncidentStatus (demo advance button). */
export const INCIDENT_NEXT_STATUS: Partial<Record<IncidentStatus, IncidentStatus>> = {
  reported: 'underReview',
  underReview: 'investigating',
  investigating: 'resolved',
  resolved: 'closed',
  reopened: 'investigating',
}
