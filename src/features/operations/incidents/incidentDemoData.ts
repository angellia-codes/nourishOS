import type { Priority } from '@/constants/statuses'

/** incident-report.md §5 — incidentType. */
export type IncidentType =
  | 'customerComplaint'
  | 'foodSafety'
  | 'workplaceInjury'
  | 'equipmentFailure'
  | 'theft'
  | 'securityIncident'
  | 'utilityFailure'
  | 'nearMiss'

/** incident-report.md §5 — module-specific lifecycle. */
export type IncidentStatus = 'reported' | 'underReview' | 'investigating' | 'resolved' | 'closed' | 'reopened'

/** incident-report.md §3 — type-based routing (who owns the investigation). */
export const INCIDENT_ROUTING: Record<IncidentType, string> = {
  customerComplaint: 'Outlet/Department Leader',
  foodSafety: 'Department Leader + HR (cc)',
  workplaceInjury: 'HR Manager',
  equipmentFailure: 'Engineering',
  theft: 'Security',
  securityIncident: 'Security',
  utilityFailure: 'Engineering',
  nearMiss: 'Department Leader',
}

export interface MockIncidentPerson {
  name: string
  role: 'employee' | 'customer' | 'vendor' | 'other'
}

export interface MockIncident {
  id: string
  incidentNumber: string
  title: string
  description: string
  incidentType: IncidentType
  severity: Priority
  location: string
  outletId: string
  departmentId: string
  occurredAt: string // ISO datetime
  reportedByName: string
  assignedToName: string
  peopleInvolved: MockIncidentPerson[]
  witnesses: { name: string; contact?: string }[]
  immediateActionTaken: string
  emergencyServicesCalled: boolean
  status: IncidentStatus
  resolutionSummary?: string
  linkedWorkOrderId?: string
  attachmentCount: number
}

export const MOCK_INCIDENTS: MockIncident[] = [
  {
    id: 'inc-1',
    incidentNumber: 'INC-2026-0031',
    title: 'Walk-in chiller compressor failure',
    description: 'Chiller temperature climbed to 9°C overnight; compressor not cycling. Stock moved to backup chiller.',
    incidentType: 'equipmentFailure',
    severity: 'critical',
    location: 'Kitchen — walk-in chiller',
    outletId: 'outlet-canggu',
    departmentId: 'kitchen',
    occurredAt: '2026-07-16T06:30',
    reportedByName: 'I Wayan Surya Aditya',
    assignedToName: 'Engineering',
    peopleInvolved: [{ name: 'I Wayan Surya Aditya', role: 'employee' }],
    witnesses: [],
    immediateActionTaken: 'Moved all perishables to backup chiller; temperature log started; supplier deliveries paused.',
    emergencyServicesCalled: false,
    status: 'investigating',
    linkedWorkOrderId: 'WO-2026-0142',
    attachmentCount: 3,
  },
  {
    id: 'inc-2',
    incidentNumber: 'INC-2026-0030',
    title: 'Guest slipped near entrance during rain',
    description: 'Guest slipped on wet tile at the front entrance. Minor bruise, declined medical assistance.',
    incidentType: 'customerComplaint',
    severity: 'high',
    location: 'Front entrance',
    outletId: 'outlet-sanur',
    departmentId: 'fnb',
    occurredAt: '2026-07-15T18:45',
    reportedByName: 'Ni Made Ayu Ratih',
    assignedToName: 'Outlet/Department Leader',
    peopleInvolved: [{ name: 'Guest (name withheld)', role: 'customer' }],
    witnesses: [{ name: 'Gede Arya Wibawa', contact: 'gede@nourish.id' }],
    immediateActionTaken: 'Area dried and cordoned; wet-floor signage placed; complimentary dessert offered.',
    emergencyServicesCalled: false,
    status: 'underReview',
    attachmentCount: 2,
  },
  {
    id: 'inc-3',
    incidentNumber: 'INC-2026-0028',
    title: 'Line cook burn during service',
    description: 'Second-degree burn on left forearm from fryer oil splash during Friday dinner service.',
    incidentType: 'workplaceInjury',
    severity: 'high',
    location: 'Kitchen — fry station',
    outletId: 'outlet-ubud',
    departmentId: 'kitchen',
    occurredAt: '2026-07-11T19:20',
    reportedByName: 'Putu Indah Lestari',
    assignedToName: 'HR Manager',
    peopleInvolved: [{ name: 'Komang Tri Wijaya', role: 'employee' }],
    witnesses: [{ name: 'Putu Indah Lestari' }],
    immediateActionTaken: 'First aid applied on site; employee taken to clinic; station deep-cleaned before service resumed.',
    emergencyServicesCalled: true,
    status: 'resolved',
    resolutionSummary: 'Clinic treatment completed, 3 rest days granted. Fryer splash guard replaced; refresher briefing held.',
    attachmentCount: 1,
  },
  {
    id: 'inc-4',
    incidentNumber: 'INC-2026-0026',
    title: 'Cash drawer discrepancy after closing',
    description: 'IDR 750,000 missing from the bar cash drawer at reconciliation. CCTV footage pulled for the shift.',
    incidentType: 'theft',
    severity: 'medium',
    location: 'Bar — POS 2',
    outletId: 'outlet-sanur',
    departmentId: 'fnb',
    occurredAt: '2026-07-09T23:10',
    reportedByName: 'Gede Arya Wibawa',
    assignedToName: 'Security',
    peopleInvolved: [],
    witnesses: [],
    immediateActionTaken: 'Drawer sealed, CCTV export requested, shift roster attached.',
    emergencyServicesCalled: false,
    status: 'reopened',
    resolutionSummary: 'Initially closed as a counting error; reopened after a second discrepancy on the same drawer.',
    attachmentCount: 4,
  },
  {
    id: 'inc-5',
    incidentNumber: 'INC-2026-0022',
    title: 'Near miss — falling shelf bracket in dry store',
    description: 'Upper shelf bracket gave way while a staff member was nearby; no contact, stock caught by lower shelf.',
    incidentType: 'nearMiss',
    severity: 'low',
    location: 'Dry store',
    outletId: 'outlet-ubud',
    departmentId: 'kitchen',
    occurredAt: '2026-07-03T10:05',
    reportedByName: 'Komang Tri Wijaya',
    assignedToName: 'Department Leader',
    peopleInvolved: [{ name: 'Komang Tri Wijaya', role: 'employee' }],
    witnesses: [],
    immediateActionTaken: 'Shelf unloaded and taken out of use; bracket flagged to Engineering.',
    emergencyServicesCalled: false,
    status: 'closed',
    resolutionSummary: 'All dry-store brackets re-torqued and load limits labelled.',
    attachmentCount: 1,
  },
]
