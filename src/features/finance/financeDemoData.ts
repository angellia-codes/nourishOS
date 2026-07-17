/** finance.md §5 — Expense Requests. Demo stand-ins for outlet/department/cost-center master lists. */
export const FINANCE_OUTLETS = [
  { id: 'outlet-sanur', name: 'Sanur' },
  { id: 'outlet-canggu', name: 'Canggu' },
  { id: 'outlet-ubud', name: 'Ubud' },
]

export const FINANCE_DEPARTMENTS = [
  { id: 'fnb', name: 'F&B' },
  { id: 'kitchen', name: 'Kitchen' },
  { id: 'management', name: 'Management' },
  { id: 'engineering', name: 'Engineering' },
]

/** expense-request.md §4/§6 "category" — camelCase keys per the module spec. */
export type ExpenseCategory =
  | 'officeSupplies'
  | 'utilities'
  | 'maintenance'
  | 'marketing'
  | 'transportation'
  | 'training'
  | 'staffWelfare'
  | 'foodBeverage'
  | 'other'

/** expense-request.md §6 "status". */
export type ExpenseStatus =
  | 'draft'
  | 'submitted'
  | 'pendingApproval'
  | 'approved'
  | 'rejected'
  | 'returnedForRevision'
  | 'cancelled'
  | 'paid'
  | 'closed'

export type ExpenseApprovalStepStatus = 'approved' | 'rejected' | 'pending' | 'waiting'

export interface MockExpenseApprovalStep {
  role: string
  approverName: string
  status: ExpenseApprovalStepStatus
  decidedAt?: string
  comment?: string
}

export interface MockExpenseItem {
  description: string
  category: ExpenseCategory
  amount: number
}

export interface MockExpenseRequest {
  id: string
  requestNumber: string
  outletId: string
  departmentId: string
  costCenter: string
  requestedByName: string
  expenseDate: string
  createdAt: string
  items: MockExpenseItem[]
  hasReceipt: boolean
  status: ExpenseStatus
  approvalSteps: MockExpenseApprovalStep[]
  rejectionReason?: string
}

export function totalAmount(items: MockExpenseItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

/** expense-request.md §3 — ≤ IDR 5,000,000: Manager → Finance; above: + GM → Director. */
export function computeExpenseApprovalChain(amount: number): string[] {
  const base = ['Manager', 'Finance']
  return amount > 5_000_000 ? [...base, 'General Manager', 'Director'] : base
}

export const MOCK_EXPENSE_REQUESTS: MockExpenseRequest[] = [
  {
    id: 'exp-1',
    requestNumber: 'EXP-2026-0112',
    outletId: 'outlet-sanur',
    departmentId: 'fnb',
    costCenter: 'CC-SNR-FNB',
    requestedByName: 'Ni Made Ayu Ratih',
    expenseDate: '2026-07-14',
    createdAt: '2026-07-15',
    items: [
      { description: 'Replacement service trays (x20)', category: 'officeSupplies', amount: 850000 },
      { description: 'Dining area floral arrangements', category: 'other', amount: 400000 },
    ],
    hasReceipt: true,
    status: 'pendingApproval',
    approvalSteps: [
      { role: 'Manager', approverName: 'Gede Arya Wibawa', status: 'approved', decidedAt: '2026-07-15' },
      { role: 'Finance', approverName: 'Kadek Bayu Santika', status: 'pending' },
    ],
  },
  {
    id: 'exp-2',
    requestNumber: 'EXP-2026-0108',
    outletId: 'outlet-canggu',
    departmentId: 'kitchen',
    costCenter: 'CC-CGU-KIT',
    requestedByName: 'I Wayan Surya Aditya',
    expenseDate: '2026-07-10',
    createdAt: '2026-07-11',
    items: [{ description: 'Emergency walk-in chiller repair', category: 'maintenance', amount: 6_200_000 }],
    hasReceipt: true,
    status: 'approved',
    approvalSteps: [
      { role: 'Manager', approverName: 'I Wayan Surya Aditya', status: 'approved', decidedAt: '2026-07-11' },
      { role: 'Finance', approverName: 'Kadek Bayu Santika', status: 'approved', decidedAt: '2026-07-12' },
      { role: 'General Manager', approverName: 'Made Dwi Cahyadi', status: 'approved', decidedAt: '2026-07-12' },
      { role: 'Director', approverName: 'Anak Agung Bagus Wirawan', status: 'approved', decidedAt: '2026-07-13' },
    ],
  },
  {
    id: 'exp-3',
    requestNumber: 'EXP-2026-0099',
    outletId: 'outlet-ubud',
    departmentId: 'management',
    costCenter: 'CC-UBD-MGT',
    requestedByName: 'Putu Indah Lestari',
    expenseDate: '2026-07-01',
    createdAt: '2026-07-02',
    items: [{ description: 'Team welfare lunch, hygiene audit pass', category: 'staffWelfare', amount: 1_100_000 }],
    hasReceipt: true,
    status: 'paid',
    approvalSteps: [
      { role: 'Manager', approverName: 'Putu Indah Lestari', status: 'approved', decidedAt: '2026-07-02' },
      { role: 'Finance', approverName: 'Kadek Bayu Santika', status: 'approved', decidedAt: '2026-07-03' },
    ],
  },
  {
    id: 'exp-4',
    requestNumber: 'EXP-2026-0121',
    outletId: 'outlet-sanur',
    departmentId: 'engineering',
    costCenter: 'CC-SNR-ENG',
    requestedByName: 'Kadek Bayu Santika',
    expenseDate: '2026-07-17',
    createdAt: '2026-07-17',
    items: [{ description: 'Generator diesel refill', category: 'utilities', amount: 750000 }],
    hasReceipt: false,
    status: 'returnedForRevision',
    approvalSteps: [
      {
        role: 'Manager',
        approverName: 'Gede Arya Wibawa',
        status: 'rejected',
        decidedAt: '2026-07-17',
        comment: 'Missing receipt — resubmit with proof of purchase.',
      },
    ],
    rejectionReason: 'Missing receipt — resubmit with proof of purchase.',
  },
  {
    id: 'exp-5',
    requestNumber: 'EXP-2026-0124',
    outletId: 'outlet-canggu',
    departmentId: 'fnb',
    costCenter: 'CC-CGU-FNB',
    requestedByName: 'I Wayan Surya Aditya',
    expenseDate: '2026-07-17',
    createdAt: '2026-07-17',
    items: [],
    hasReceipt: false,
    status: 'draft',
    approvalSteps: [],
  },
  {
    id: 'exp-6',
    requestNumber: 'EXP-2026-0119',
    outletId: 'outlet-ubud',
    departmentId: 'kitchen',
    costCenter: 'CC-UBD-KIT',
    requestedByName: 'Ni Made Ayu Ratih',
    expenseDate: '2026-07-12',
    createdAt: '2026-07-13',
    items: [{ description: 'Duplicate knife-set order — superseded by exp-0108', category: 'other', amount: 1_900_000 }],
    hasReceipt: true,
    status: 'cancelled',
    approvalSteps: [{ role: 'Manager', approverName: 'Gede Arya Wibawa', status: 'waiting' }],
  },
]
