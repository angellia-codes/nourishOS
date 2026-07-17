import { REQUISITION_DEPARTMENTS, REQUISITION_OUTLETS } from '@/features/hr/recruitment/employeeRequisitionDemoData'
import type { ChecklistItemStatus, ChecklistTier, ChecklistTreatment } from '@/features/hr/onboarding/onboardingDemoData'

export { REQUISITION_DEPARTMENTS, REQUISITION_OUTLETS }

export type RoleTier = 'floorStaff' | 'backofficeOrSupervisorPlus'
export type OffboardingTaskStatus = 'pending' | 'inProgress' | 'completed'
export type OffboardingTaskType = 'assetAssignment' | 'documentReview' | 'custom'

export interface DocumentChecklistItemTemplate {
  itemNumber: number
  label: string
  tier: ChecklistTier
  treatment: ChecklistTreatment
  note?: string
}

/** employee-onboarding-exit-checklist.md §6 — documentChecklist holds only OUT items 1, 6, 9; the rest become tasks (§5). */
export const OUT_DOCUMENT_CHECKLIST_TEMPLATE: DocumentChecklistItemTemplate[] = [
  { itemNumber: 1, label: 'Resignation Letter', tier: 'mandatory', treatment: 'collect' },
  { itemNumber: 6, label: 'Employee Out Photo Taking', tier: 'optional', treatment: 'collect', note: 'Low-priority process step — a checkbox, not a dedicated task.' },
  {
    itemNumber: 9,
    label: 'Surat Pernyataan Bermaterai (stamped statutory declaration)',
    tier: 'mandatory',
    treatment: 'collect',
    note: 'Physical/legal artifact — system holds a scanned copy after physical signing.',
  },
]

export interface MockDocumentChecklistItem extends DocumentChecklistItemTemplate {
  status: ChecklistItemStatus
  receivedDate?: string
}

interface OffboardingTaskTemplate {
  key: string
  title: string
  type: OffboardingTaskType
  tag?: string
  assigneeRole: string
  /** false only for Task/Work Reassignment Review — gated to backoffice/supervisor+ exits (§5 item 8). */
  alwaysApplicable: boolean
}

/** employee-onboarding-exit-checklist.md §5 "Reconciled exit checklist" table. */
export const OFFBOARDING_TASK_TEMPLATE: OffboardingTaskTemplate[] = [
  { key: 'assets', title: 'Asset Return', type: 'assetAssignment', assigneeRole: 'Outlet Manager', alwaysApplicable: true },
  {
    key: 'docs',
    title: 'Document Handover (resignation letter, bermaterai statement, out photo)',
    type: 'documentReview',
    tag: 'offboarding-docs',
    assigneeRole: 'HR Admin',
    alwaysApplicable: true,
  },
  {
    key: 'reassignment',
    title: 'Task/Work Reassignment Review',
    type: 'custom',
    tag: 'offboarding-reassignment',
    assigneeRole: 'Department Leader',
    alwaysApplicable: false,
  },
  { key: 'settlement', title: 'Final Settlement Calculation', type: 'custom', tag: 'offboarding-settlement', assigneeRole: 'Finance', alwaysApplicable: true },
  { key: 'interview', title: 'Exit Interview', type: 'custom', tag: 'offboarding-interview', assigneeRole: 'HR Manager', alwaysApplicable: true },
  {
    key: 'reference',
    title: 'Issue Certificate / Reference Letter',
    type: 'custom',
    tag: 'offboarding-reference',
    assigneeRole: 'HR Manager',
    alwaysApplicable: true,
  },
  { key: 'bpjs', title: 'BPJS-TK Closure Letter', type: 'custom', tag: 'offboarding-bpjs', assigneeRole: 'HR Admin', alwaysApplicable: true },
]

export interface MockOffboardingTask {
  key: string
  title: string
  type: OffboardingTaskType
  tag?: string
  assigneeRole: string
  applicable: boolean
  status: OffboardingTaskStatus
}

export interface MockOffboardingChecklist {
  id: string
  employeeName: string
  employeeNumber: string
  position: string
  departmentId: string
  outletId: string
  roleTier: RoleTier
  lastWorkingDate: string
  status: 'inProgress' | 'completed'
  documentChecklist: MockDocumentChecklistItem[]
  tasks: MockOffboardingTask[]
  clearanceStatementFileId?: string
}

function buildDocs(receivedNumbers: number[]): MockDocumentChecklistItem[] {
  return OUT_DOCUMENT_CHECKLIST_TEMPLATE.map((template) => ({
    ...template,
    status: receivedNumbers.includes(template.itemNumber) ? 'received' : 'pending',
    receivedDate: receivedNumbers.includes(template.itemNumber) ? '2026-07-05' : undefined,
  }))
}

function buildTasks(roleTier: RoleTier, statusByKey: Record<string, OffboardingTaskStatus>): MockOffboardingTask[] {
  return OFFBOARDING_TASK_TEMPLATE.map((template) => {
    const applicable = template.alwaysApplicable || (template.key === 'reassignment' && roleTier === 'backofficeOrSupervisorPlus')
    return {
      key: template.key,
      title: template.title,
      type: template.type,
      tag: template.tag,
      assigneeRole: template.assigneeRole,
      applicable,
      status: applicable ? (statusByKey[template.key] ?? 'pending') : 'completed',
    }
  })
}

export const MOCK_OFFBOARDING_CHECKLISTS: MockOffboardingChecklist[] = [
  {
    id: 'off-1',
    employeeName: 'Gede Arya Wibawa',
    employeeNumber: 'N-0005',
    position: 'Outlet Leader',
    departmentId: 'management',
    outletId: 'outlet-canggu',
    roleTier: 'backofficeOrSupervisorPlus',
    lastWorkingDate: '2026-05-20',
    status: 'completed',
    documentChecklist: buildDocs([1, 6, 9]),
    tasks: buildTasks('backofficeOrSupervisorPlus', {
      assets: 'completed',
      docs: 'completed',
      reassignment: 'completed',
      settlement: 'completed',
      interview: 'completed',
      reference: 'completed',
      bpjs: 'completed',
    }),
    clearanceStatementFileId: 'file-clearance-off-1.pdf',
  },
  {
    id: 'off-2',
    employeeName: 'Made Dwi Lestari',
    employeeNumber: 'N-0006',
    position: 'Waiter',
    departmentId: 'fnb',
    outletId: 'outlet-sanur',
    roleTier: 'floorStaff',
    lastWorkingDate: '2026-07-25',
    status: 'inProgress',
    documentChecklist: buildDocs([1]),
    tasks: buildTasks('floorStaff', {
      assets: 'completed',
      docs: 'inProgress',
      settlement: 'pending',
      interview: 'pending',
      reference: 'pending',
      bpjs: 'pending',
    }),
  },
  {
    id: 'off-3',
    employeeName: 'Komang Yuda Pratama',
    employeeNumber: 'N-0007',
    position: 'Finance Staff',
    departmentId: 'management',
    outletId: 'outlet-ubud',
    roleTier: 'backofficeOrSupervisorPlus',
    lastWorkingDate: '2026-07-30',
    status: 'inProgress',
    documentChecklist: buildDocs([]),
    tasks: buildTasks('backofficeOrSupervisorPlus', {
      assets: 'pending',
      docs: 'pending',
      reassignment: 'pending',
      settlement: 'pending',
      interview: 'pending',
      reference: 'pending',
      bpjs: 'pending',
    }),
  },
]
