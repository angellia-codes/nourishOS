import { POSITION_LABELS, type PositionId } from '@/constants/positions'

/** employee-requisition.md §3 Section A — outlet/department pickers (demo stand-in for the real master lists). */
export const REQUISITION_OUTLETS = [
  { id: 'outlet-sanur', name: 'Sanur' },
  { id: 'outlet-canggu', name: 'Canggu' },
  { id: 'outlet-ubud', name: 'Ubud' },
]

export const REQUISITION_DEPARTMENTS = [
  { id: 'fnb', name: 'F&B' },
  { id: 'kitchen', name: 'Kitchen' },
  { id: 'management', name: 'Management' },
  { id: 'housekeeping', name: 'Housekeeping' },
]

export { POSITION_LABELS }
export type { PositionId }

/** employee-requisition.md §3 Section A. */
export type EmploymentType = 'ft' | 'fl' | 'dw' | 'ojt' | 'fixed_term'
export type RequisitionType = 'new_position' | 'replacement' | 'seasonal'
export type Urgency = 'normal' | 'urgent' | 'critical'

/** employee-requisition.md §2 — `status` (Approval Engine lifecycle) vs `vacancyStage` (recruitment-owned, only exists once approved). */
export type RequisitionStatus = 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'completed' | 'cancelled'
export type VacancyStage = 'open' | 'sourcing' | 'interviewing' | 'offering' | 'filled' | 'closed'

export type ApprovalStepStatus = 'approved' | 'rejected' | 'pending' | 'waiting'

export interface MockApprovalStep {
  role: string
  approverName: string
  status: ApprovalStepStatus
  decidedAt?: string
  comment?: string
}

export interface MockRequisition {
  id: string
  requisitionNumber: string
  outletId: string
  departmentId: string
  positionId: PositionId | null
  positionTitleFallback?: string
  openings: number
  employmentType: EmploymentType
  contractMonths?: number
  requisitionType: RequisitionType
  replacingEmployeeId?: string
  targetJoinDate: string
  urgency: Urgency
  justification: string
  responsibilities: string
  requirements: string
  workSchedule: string
  budgeted: boolean
  salaryMin: number
  salaryMax: number
  status: RequisitionStatus
  vacancyStage?: VacancyStage
  requestedByName: string
  createdAt: string
  approvalSteps: MockApprovalStep[]
  rejectionReason?: string
  filledCount: number
}

/** employee-requisition.md §5 — chain shape depends on budgeted flag and requester role. */
export function computeApprovalChain(budgeted: boolean, requestedByHrManager: boolean): string[] {
  if (requestedByHrManager) {
    return budgeted ? ['GM'] : ['GM', 'Director']
  }
  const base = ['Dept Leader / Outlet Manager', 'HR Manager', 'GM']
  return budgeted ? base : [...base, 'Director']
}

export const MOCK_REQUISITIONS: MockRequisition[] = [
  {
    id: 'req-1',
    requisitionNumber: 'REQ-2026-0038',
    outletId: 'outlet-sanur',
    departmentId: 'fnb',
    positionId: 'waiter',
    openings: 2,
    employmentType: 'ft',
    requisitionType: 'new_position',
    targetJoinDate: '2026-08-15',
    urgency: 'urgent',
    justification: 'Weekend covers have exceeded current floor capacity for six consecutive weeks.',
    responsibilities: 'Table service, order taking, guest experience for the main dining room.',
    requirements: 'Min. 1 year F&B service experience, food safety awareness.',
    workSchedule: 'Rotating shifts, 5 days/week, weekend availability required.',
    budgeted: true,
    salaryMin: 3800000,
    salaryMax: 4200000,
    status: 'pending_approval',
    requestedByName: 'Ni Made Ayu Ratih',
    createdAt: '2026-07-10',
    approvalSteps: [
      { role: 'Dept Leader / Outlet Manager', approverName: 'Gede Arya Wibawa', status: 'approved', decidedAt: '2026-07-11' },
      { role: 'HR Manager', approverName: 'Sri Wahyuni', status: 'pending' },
      { role: 'GM', approverName: 'Made Dwi Cahyadi', status: 'waiting' },
    ],
    filledCount: 0,
  },
  {
    id: 'req-2',
    requisitionNumber: 'REQ-2026-0035',
    outletId: 'outlet-canggu',
    departmentId: 'fnb',
    positionId: 'barista',
    openings: 1,
    employmentType: 'ft',
    requisitionType: 'replacement',
    replacingEmployeeId: 'demo-2',
    targetJoinDate: '2026-07-28',
    urgency: 'normal',
    justification: 'Backfill for resigning barista, last day 2026-07-25.',
    responsibilities: 'Espresso bar, latte art, stock rotation for the coffee station.',
    requirements: 'Min. 6 months barista experience, latte art a plus.',
    workSchedule: 'Rotating shifts, 5 days/week.',
    budgeted: true,
    salaryMin: 3900000,
    salaryMax: 4300000,
    status: 'approved',
    vacancyStage: 'sourcing',
    requestedByName: 'I Wayan Surya Aditya',
    createdAt: '2026-07-05',
    approvalSteps: [
      { role: 'Dept Leader / Outlet Manager', approverName: 'I Wayan Surya Aditya', status: 'approved', decidedAt: '2026-07-06' },
      { role: 'HR Manager', approverName: 'Sri Wahyuni', status: 'approved', decidedAt: '2026-07-07' },
      { role: 'GM', approverName: 'Made Dwi Cahyadi', status: 'approved', decidedAt: '2026-07-08' },
    ],
    filledCount: 0,
  },
  {
    id: 'req-3',
    requisitionNumber: 'REQ-2026-0031',
    outletId: 'outlet-ubud',
    departmentId: 'management',
    positionId: 'outletLeader',
    openings: 1,
    employmentType: 'ft',
    requisitionType: 'new_position',
    targetJoinDate: '2026-08-01',
    urgency: 'critical',
    justification: 'Ubud outlet has operated without a permanent department leader since June.',
    responsibilities: 'Full outlet P&L ownership, staff scheduling, compliance.',
    requirements: 'Min. 3 years F&B leadership experience.',
    workSchedule: 'Full-time, on-call for outlet emergencies.',
    budgeted: false,
    salaryMin: 8500000,
    salaryMax: 10000000,
    status: 'pending_approval',
    requestedByName: 'Putu Indah Lestari',
    createdAt: '2026-07-02',
    approvalSteps: [
      { role: 'Dept Leader / Outlet Manager', approverName: 'Putu Indah Lestari', status: 'approved', decidedAt: '2026-07-03' },
      { role: 'HR Manager', approverName: 'Sri Wahyuni', status: 'approved', decidedAt: '2026-07-05' },
      { role: 'GM', approverName: 'Made Dwi Cahyadi', status: 'pending' },
      { role: 'Director', approverName: 'Anak Agung Bagus Wirawan', status: 'waiting' },
    ],
    filledCount: 0,
  },
  {
    id: 'req-4',
    requisitionNumber: 'REQ-2026-0028',
    outletId: 'outlet-sanur',
    departmentId: 'kitchen',
    positionId: 'cook',
    openings: 1,
    employmentType: 'ft',
    requisitionType: 'replacement',
    replacingEmployeeId: 'demo-3',
    targetJoinDate: '2026-06-20',
    urgency: 'normal',
    justification: 'Backfill for cook transferred to Canggu outlet.',
    responsibilities: 'Line cooking, prep, kitchen hygiene compliance.',
    requirements: 'Min. 1 year kitchen experience.',
    workSchedule: 'Rotating shifts, 6 days/week.',
    budgeted: true,
    salaryMin: 3600000,
    salaryMax: 4000000,
    status: 'completed',
    vacancyStage: 'filled',
    requestedByName: 'Ni Made Ayu Ratih',
    createdAt: '2026-06-01',
    approvalSteps: [
      { role: 'Dept Leader / Outlet Manager', approverName: 'Ni Made Ayu Ratih', status: 'approved', decidedAt: '2026-06-02' },
      { role: 'HR Manager', approverName: 'Sri Wahyuni', status: 'approved', decidedAt: '2026-06-03' },
      { role: 'GM', approverName: 'Made Dwi Cahyadi', status: 'approved', decidedAt: '2026-06-04' },
    ],
    filledCount: 1,
  },
  {
    id: 'req-5',
    requisitionNumber: 'REQ-2026-0022',
    outletId: 'outlet-canggu',
    departmentId: 'fnb',
    positionId: 'cashier',
    openings: 1,
    employmentType: 'dw',
    requisitionType: 'seasonal',
    targetJoinDate: '2026-06-01',
    urgency: 'normal',
    justification: 'Extra cashier coverage for the July high season.',
    responsibilities: 'Front-of-house cashiering during peak hours.',
    requirements: 'Cash handling experience preferred.',
    workSchedule: 'Daily worker, event-based scheduling.',
    budgeted: true,
    salaryMin: 150000,
    salaryMax: 180000,
    status: 'rejected',
    requestedByName: 'I Wayan Surya Aditya',
    createdAt: '2026-05-20',
    approvalSteps: [
      { role: 'Dept Leader / Outlet Manager', approverName: 'I Wayan Surya Aditya', status: 'approved', decidedAt: '2026-05-21' },
      {
        role: 'HR Manager',
        approverName: 'Sri Wahyuni',
        status: 'rejected',
        decidedAt: '2026-05-22',
        comment: 'Headcount frozen for Q3 pending revenue review.',
      },
    ],
    rejectionReason: 'Headcount frozen for Q3 pending revenue review.',
    filledCount: 0,
  },
  {
    id: 'req-6',
    requisitionNumber: 'REQ-2026-0041',
    outletId: 'outlet-sanur',
    departmentId: 'fnb',
    positionId: null,
    positionTitleFallback: 'Bar Supervisor',
    openings: 1,
    employmentType: 'ft',
    requisitionType: 'new_position',
    targetJoinDate: '2026-09-01',
    urgency: 'normal',
    justification: 'New bar program needs dedicated supervision.',
    responsibilities: 'Bar operations, inventory, staff training.',
    requirements: 'Min. 2 years bar management experience.',
    workSchedule: 'Full-time, evening-heavy shifts.',
    budgeted: true,
    salaryMin: 5500000,
    salaryMax: 6500000,
    status: 'draft',
    requestedByName: 'Ni Made Ayu Ratih',
    createdAt: '2026-07-15',
    approvalSteps: [],
    filledCount: 0,
  },
]
