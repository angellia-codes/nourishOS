import { POSITION_LABELS } from '@/constants/positions'
import { REQUISITION_DEPARTMENTS, REQUISITION_OUTLETS } from './employeeRequisitionDemoData'

export { REQUISITION_DEPARTMENTS, REQUISITION_OUTLETS }

/** HR_OPERATIONS.md §9.4 "Recruitment Pipeline Stages" — ST-01 through ST-08, in board order. */
export type CandidateStage = 'ST-01' | 'ST-02' | 'ST-03' | 'ST-04' | 'ST-05' | 'ST-06' | 'ST-07' | 'ST-08'

/** employment-application-form.md §2 — the canonical recruitment-source superset (supersedes the
 *  smaller enums once proposed in the onboarding and exit-interview specs; onboarding re-exports this). */
export type RecruitmentSource =
  | 'jobPortal'
  | 'referral'
  | 'socialMedia'
  | 'broadcast'
  | 'newspaperAd'
  | 'appliedDirectly'
  | 'otherAdvertisement'
  | 'employmentAgency'
  | 'other'

export type CandidateSource = RecruitmentSource

export interface StageHistoryEntry {
  from: CandidateStage | null
  to: CandidateStage
  actor: string
  timestamp: string
}

export interface MockCandidate {
  id: string
  candidateNumber: string
  fullName: string
  phone: string
  positionApplied: string
  outletId: string
  departmentId: string
  applicationDate: string
  source: CandidateSource
  currentStage: CandidateStage
  daysInCurrentStage: number
  hrInterviewScore?: number
  userInterviewScore?: number
  offeredSalary?: number
  totalDaysToHire?: number
  rejectionReason?: string
  stageHistory: StageHistoryEntry[]
}

export const MOCK_CANDIDATES: MockCandidate[] = [
  {
    id: 'cand-1',
    candidateNumber: 'C-2026-0041',
    fullName: 'Ayu Kartika Dewi',
    phone: '+62 812-1111-0001',
    positionApplied: POSITION_LABELS.waiter,
    outletId: 'outlet-sanur',
    departmentId: 'fnb',
    applicationDate: '2026-07-15',
    source: 'jobPortal',
    currentStage: 'ST-01',
    daysInCurrentStage: 2,
    stageHistory: [{ from: null, to: 'ST-01', actor: 'Ayu Kartika Dewi', timestamp: '2026-07-15' }],
  },
  {
    id: 'cand-2',
    candidateNumber: 'C-2026-0039',
    fullName: 'Bagus Aditya Pratama',
    phone: '+62 812-1111-0002',
    positionApplied: POSITION_LABELS.cook,
    outletId: 'outlet-sanur',
    departmentId: 'kitchen',
    applicationDate: '2026-07-12',
    source: 'referral',
    currentStage: 'ST-02',
    daysInCurrentStage: 3,
    stageHistory: [
      { from: null, to: 'ST-01', actor: 'Bagus Aditya Pratama', timestamp: '2026-07-12' },
      { from: 'ST-01', to: 'ST-02', actor: 'Sri Wahyuni', timestamp: '2026-07-14' },
    ],
  },
  {
    id: 'cand-3',
    candidateNumber: 'C-2026-0035',
    fullName: 'Citra Maharani',
    phone: '+62 812-1111-0003',
    positionApplied: POSITION_LABELS.barista,
    outletId: 'outlet-canggu',
    departmentId: 'fnb',
    applicationDate: '2026-07-08',
    source: 'socialMedia',
    currentStage: 'ST-03',
    daysInCurrentStage: 1,
    hrInterviewScore: undefined,
    stageHistory: [
      { from: null, to: 'ST-01', actor: 'Citra Maharani', timestamp: '2026-07-08' },
      { from: 'ST-01', to: 'ST-02', actor: 'Sri Wahyuni', timestamp: '2026-07-09' },
      { from: 'ST-02', to: 'ST-03', actor: 'Sri Wahyuni', timestamp: '2026-07-16' },
    ],
  },
  {
    id: 'cand-4',
    candidateNumber: 'C-2026-0030',
    fullName: 'Dharma Putra Wicaksana',
    phone: '+62 812-1111-0004',
    positionApplied: POSITION_LABELS.outletLeader,
    outletId: 'outlet-ubud',
    departmentId: 'management',
    applicationDate: '2026-06-28',
    source: 'other',
    currentStage: 'ST-04',
    daysInCurrentStage: 4,
    hrInterviewScore: 4,
    stageHistory: [
      { from: null, to: 'ST-01', actor: 'Dharma Putra Wicaksana', timestamp: '2026-06-28' },
      { from: 'ST-01', to: 'ST-02', actor: 'Sri Wahyuni', timestamp: '2026-06-30' },
      { from: 'ST-02', to: 'ST-03', actor: 'Sri Wahyuni', timestamp: '2026-07-02' },
      { from: 'ST-03', to: 'ST-04', actor: 'Sri Wahyuni', timestamp: '2026-07-12' },
    ],
  },
  {
    id: 'cand-5',
    candidateNumber: 'C-2026-0027',
    fullName: 'Eka Purnama Sari',
    phone: '+62 812-1111-0005',
    positionApplied: POSITION_LABELS.cashier,
    outletId: 'outlet-canggu',
    departmentId: 'fnb',
    applicationDate: '2026-06-20',
    source: 'appliedDirectly',
    currentStage: 'ST-05',
    daysInCurrentStage: 2,
    hrInterviewScore: 4,
    userInterviewScore: 5,
    offeredSalary: 4100000,
    stageHistory: [
      { from: null, to: 'ST-01', actor: 'Eka Purnama Sari', timestamp: '2026-06-20' },
      { from: 'ST-01', to: 'ST-02', actor: 'Sri Wahyuni', timestamp: '2026-06-22' },
      { from: 'ST-02', to: 'ST-03', actor: 'Sri Wahyuni', timestamp: '2026-06-25' },
      { from: 'ST-03', to: 'ST-04', actor: 'Sri Wahyuni', timestamp: '2026-06-29' },
      { from: 'ST-04', to: 'ST-05', actor: 'Ni Made Ayu Ratih', timestamp: '2026-07-14' },
    ],
  },
  {
    id: 'cand-6',
    candidateNumber: 'C-2026-0019',
    fullName: 'Fajar Nugroho',
    phone: '+62 812-1111-0006',
    positionApplied: POSITION_LABELS.barista,
    outletId: 'outlet-canggu',
    departmentId: 'fnb',
    applicationDate: '2026-06-05',
    source: 'referral',
    currentStage: 'ST-06',
    daysInCurrentStage: 0,
    hrInterviewScore: 5,
    userInterviewScore: 4,
    offeredSalary: 4300000,
    totalDaysToHire: 27,
    stageHistory: [
      { from: null, to: 'ST-01', actor: 'Fajar Nugroho', timestamp: '2026-06-05' },
      { from: 'ST-01', to: 'ST-02', actor: 'Sri Wahyuni', timestamp: '2026-06-07' },
      { from: 'ST-02', to: 'ST-03', actor: 'Sri Wahyuni', timestamp: '2026-06-10' },
      { from: 'ST-03', to: 'ST-04', actor: 'Sri Wahyuni', timestamp: '2026-06-15' },
      { from: 'ST-04', to: 'ST-05', actor: 'I Wayan Surya Aditya', timestamp: '2026-06-25' },
      { from: 'ST-05', to: 'ST-06', actor: 'I Wayan Surya Aditya', timestamp: '2026-07-02' },
    ],
  },
  {
    id: 'cand-7',
    candidateNumber: 'C-2026-0015',
    fullName: 'Gita Anjani',
    phone: '+62 812-1111-0007',
    positionApplied: POSITION_LABELS.waiter,
    outletId: 'outlet-sanur',
    departmentId: 'fnb',
    applicationDate: '2026-05-28',
    source: 'jobPortal',
    currentStage: 'ST-07',
    daysInCurrentStage: 5,
    hrInterviewScore: 2,
    rejectionReason: 'Did not meet minimum service experience requirement.',
    stageHistory: [
      { from: null, to: 'ST-01', actor: 'Gita Anjani', timestamp: '2026-05-28' },
      { from: 'ST-01', to: 'ST-02', actor: 'Sri Wahyuni', timestamp: '2026-05-30' },
      { from: 'ST-02', to: 'ST-03', actor: 'Sri Wahyuni', timestamp: '2026-06-02' },
      { from: 'ST-03', to: 'ST-07', actor: 'Sri Wahyuni', timestamp: '2026-06-04' },
    ],
  },
  {
    id: 'cand-8',
    candidateNumber: 'C-2026-0011',
    fullName: 'Hendra Setiawan',
    phone: '+62 812-1111-0008',
    positionApplied: POSITION_LABELS.cook,
    outletId: 'outlet-ubud',
    departmentId: 'kitchen',
    applicationDate: '2026-05-15',
    source: 'other',
    currentStage: 'ST-08',
    daysInCurrentStage: 8,
    hrInterviewScore: 3,
    stageHistory: [
      { from: null, to: 'ST-01', actor: 'Hendra Setiawan', timestamp: '2026-05-15' },
      { from: 'ST-01', to: 'ST-02', actor: 'Sri Wahyuni', timestamp: '2026-05-17' },
      { from: 'ST-02', to: 'ST-03', actor: 'Sri Wahyuni', timestamp: '2026-05-20' },
      { from: 'ST-03', to: 'ST-08', actor: 'Hendra Setiawan', timestamp: '2026-05-28' },
    ],
  },
]
