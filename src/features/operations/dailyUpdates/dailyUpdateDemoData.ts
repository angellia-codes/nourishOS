export interface MockCarriedForwardTask {
  id: string
  title: string
  daysOpen: number
  currentStatus: 'assigned' | 'inProgress' | 'waiting' | 'completed'
}

/** daily-updates.md §3 Section B — tasks pulled from previous days' submissions that must be reviewed first. */
export const MOCK_CARRIED_FORWARD_TASKS: MockCarriedForwardTask[] = [
  { id: 'cf-1', title: 'Reseat wobbly chair legs, dining area 2', daysOpen: 2, currentStatus: 'assigned' },
  { id: 'cf-2', title: 'Follow up with supplier on late produce delivery', daysOpen: 6, currentStatus: 'inProgress' },
  { id: 'cf-3', title: 'Ice machine repeated compressor fault', daysOpen: 17, currentStatus: 'waiting' },
]

export type ChallengeCategory = 'staffing' | 'equipment' | 'supplier' | 'customer' | 'facility' | 'other'
export type ChallengeSeverity = 'low' | 'medium' | 'high'

export interface MockChallenge {
  description: string
  category: ChallengeCategory
  severity: ChallengeSeverity
}

export interface MockDailyReport {
  id: string
  date: string
  outletId: string
  departmentId: string
  submittedByName: string
  staffScheduled: number
  staffPresent: number
  achievements: string[]
  challenges: MockChallenge[]
  newTaskCount: number
}

/** daily-updates.md §9 Section 2 — the Updates Feed the GM/HR Homepage subscribes to, newest first. */
export const MOCK_DAILY_REPORTS: MockDailyReport[] = [
  {
    id: 'report-1',
    date: '2026-07-16',
    outletId: 'outlet-sanur',
    departmentId: 'fnb',
    submittedByName: 'Ni Made Ayu Ratih',
    staffScheduled: 12,
    staffPresent: 11,
    achievements: ['Hit weekday covers target', 'Zero complaints logged'],
    challenges: [{ description: 'POS printer offline for 20 minutes at lunch', category: 'equipment', severity: 'low' }],
    newTaskCount: 1,
  },
  {
    id: 'report-2',
    date: '2026-07-16',
    outletId: 'outlet-canggu',
    departmentId: 'fnb',
    submittedByName: 'I Wayan Surya Aditya',
    staffScheduled: 9,
    staffPresent: 7,
    achievements: ['New barista fully onboarded'],
    challenges: [
      { description: 'Two call-ins, service ran short-staffed', category: 'staffing', severity: 'high' },
      { description: 'Milk delivery arrived 2 hours late', category: 'supplier', severity: 'medium' },
    ],
    newTaskCount: 2,
  },
  {
    id: 'report-3',
    date: '2026-07-15',
    outletId: 'outlet-ubud',
    departmentId: 'fnb',
    submittedByName: 'Putu Indah Lestari',
    staffScheduled: 8,
    staffPresent: 8,
    achievements: [],
    challenges: [],
    newTaskCount: 0,
  },
  {
    id: 'report-4',
    date: '2026-07-15',
    outletId: 'outlet-canggu',
    departmentId: 'management',
    submittedByName: 'Gede Arya Wibawa',
    staffScheduled: 4,
    staffPresent: 4,
    achievements: ['Outlet passed surprise hygiene audit'],
    challenges: [{ description: 'Ice machine compressor fault recurring', category: 'equipment', severity: 'high' }],
    newTaskCount: 0,
  },
]

/** Outlets/departments expected to submit today — drives the compliance widget (daily-updates.md §9). */
export const ACTIVE_OUTLET_DEPARTMENTS = 5
