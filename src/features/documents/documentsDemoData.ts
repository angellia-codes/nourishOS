/** documents.md §6 "SOP Library" departments — all 10 per the spec. */
export const SOP_DEPARTMENTS = [
  { id: 'kitchen', name: 'Kitchen' },
  { id: 'bar', name: 'Bar' },
  { id: 'floor', name: 'Floor' },
  { id: 'security', name: 'Security' },
  { id: 'hr', name: 'HR' },
  { id: 'engineering', name: 'Engineering' },
  { id: 'finance', name: 'Finance' },
  { id: 'purchasing', name: 'Purchasing' },
  { id: 'wholefood', name: 'Wholefood' },
  { id: 'bakery', name: 'Bakery' },
]

/** documents.md §13 "Document Lifecycle". */
export type DocumentStatus = 'draft' | 'review' | 'approved' | 'published' | 'revised' | 'archived'

export interface MockDocumentVersion {
  version: string
  author: string
  changeSummary: string
  publishDate: string
}

export interface MockSopDocument {
  id: string
  documentNumber: string
  title: string
  departmentId: string
  category: string
  tags: string[]
  owner: string
  approver: string
  currentVersion: string
  status: DocumentStatus
  effectiveDate: string
  reviewDate: string
  versions: MockDocumentVersion[]
}

/** documents.md §5/§6/§17 — SOP Library entries with version history. */
export const MOCK_SOP_DOCUMENTS: MockSopDocument[] = [
  {
    id: 'sop-1',
    documentNumber: 'SOP-KIT-014',
    title: 'Walk-in Chiller Temperature Log',
    departmentId: 'kitchen',
    category: 'Food Safety',
    tags: ['HACCP', 'temperature', 'daily-check'],
    owner: 'Ni Made Ayu Ratih',
    approver: 'Made Dwi Cahyadi',
    currentVersion: 'v3.1',
    status: 'published',
    effectiveDate: '2026-05-01',
    reviewDate: '2026-11-01',
    versions: [
      { version: 'v3.1', author: 'Ni Made Ayu Ratih', changeSummary: 'Added twice-daily logging requirement', publishDate: '2026-05-01' },
      { version: 'v3.0', author: 'Ni Made Ayu Ratih', changeSummary: 'Updated acceptable temperature range', publishDate: '2026-01-15' },
      { version: 'v2.0', author: 'Sri Wahyuni', changeSummary: 'Initial HACCP alignment', publishDate: '2025-06-01' },
    ],
  },
  {
    id: 'sop-2',
    documentNumber: 'SOP-BAR-006',
    title: 'Coffee Machine Cleaning Procedure',
    departmentId: 'bar',
    category: 'Equipment',
    tags: ['coffee', 'cleaning', 'maintenance'],
    owner: 'I Wayan Surya Aditya',
    approver: 'Made Dwi Cahyadi',
    currentVersion: 'v2.0',
    status: 'published',
    effectiveDate: '2026-03-10',
    reviewDate: '2026-09-10',
    versions: [
      { version: 'v2.0', author: 'I Wayan Surya Aditya', changeSummary: 'Added descale schedule', publishDate: '2026-03-10' },
      { version: 'v1.0', author: 'I Wayan Surya Aditya', changeSummary: 'Initial version', publishDate: '2025-09-10' },
    ],
  },
  {
    id: 'sop-3',
    documentNumber: 'SOP-SEC-002',
    title: 'Security Checkpoint Patrol Procedure',
    departmentId: 'security',
    category: 'Safety',
    tags: ['patrol', 'checkpoint'],
    owner: 'Kadek Bayu Santika',
    approver: 'Anak Agung Bagus Wirawan',
    currentVersion: 'v1.2',
    status: 'review',
    effectiveDate: '2026-02-01',
    reviewDate: '2026-08-01',
    versions: [
      { version: 'v1.2', author: 'Kadek Bayu Santika', changeSummary: 'Added QR checkpoint scan step', publishDate: '2026-02-01' },
      { version: 'v1.1', author: 'Kadek Bayu Santika', changeSummary: 'Clarified incident escalation path', publishDate: '2025-11-01' },
    ],
  },
  {
    id: 'sop-4',
    documentNumber: 'SOP-HR-009',
    title: 'New Hire Document Collection Checklist',
    departmentId: 'hr',
    category: 'Onboarding',
    tags: ['onboarding', 'compliance'],
    owner: 'Sri Wahyuni',
    approver: 'Made Dwi Cahyadi',
    currentVersion: 'v1.0',
    status: 'draft',
    effectiveDate: '2026-07-20',
    reviewDate: '2027-01-20',
    versions: [{ version: 'v1.0', author: 'Sri Wahyuni', changeSummary: 'Initial draft, pending review', publishDate: '2026-07-17' }],
  },
  {
    id: 'sop-5',
    documentNumber: 'SOP-ENG-003',
    title: 'Generator Weekly Maintenance Checklist',
    departmentId: 'engineering',
    category: 'Maintenance',
    tags: ['generator', 'preventive-maintenance'],
    owner: 'Kadek Bayu Santika',
    approver: 'Made Dwi Cahyadi',
    currentVersion: 'v2.1',
    status: 'archived',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    versions: [
      { version: 'v2.1', author: 'Kadek Bayu Santika', changeSummary: 'Superseded by new vendor maintenance contract', publishDate: '2024-01-01' },
    ],
  },
]
