import { MOCK_EMPLOYEES } from '@/features/hr/pages/employeeDemoData'

/** employee-onboarding-exit-checklist.md §6 DocumentChecklistItem. */
export type ChecklistTier = 'mandatory' | 'followUp' | 'optional' | 'process'
export type ChecklistTreatment = 'collect' | 'verify' | 'generate' | 'notDigitized'
export type ChecklistItemStatus = 'pending' | 'received' | 'notApplicable'

export interface DocumentChecklistItemTemplate {
  itemNumber: number
  label: string
  tier: ChecklistTier
  treatment: ChecklistTreatment
  linkedRecordType?: 'candidate' | 'requisition' | 'contract' | 'employee'
  note?: string
}

/** employee-onboarding-exit-checklist.md §4 — 30 printed, 28 active; item 9 merged into 8, item 16 removed, item 30 lives on the candidate/requisition record (§6) rather than this array — 27 rows here. */
export const DOCUMENT_CHECKLIST_TEMPLATE: DocumentChecklistItemTemplate[] = [
  { itemNumber: 1, label: 'Application Letter / Surat Lamaran Kerja', tier: 'process', treatment: 'verify', linkedRecordType: 'candidate' },
  { itemNumber: 2, label: 'Curriculum Vitae / Daftar Riwayat Hidup', tier: 'process', treatment: 'verify', linkedRecordType: 'candidate' },
  { itemNumber: 3, label: 'Copy of Ijazah & transcript', tier: 'mandatory', treatment: 'collect' },
  { itemNumber: 4, label: 'Copy of Working Reference (if previously employed)', tier: 'mandatory', treatment: 'collect' },
  { itemNumber: 5, label: 'Copy of Professional Certification', tier: 'optional', treatment: 'collect' },
  { itemNumber: 6, label: 'Photo 4×6, red background', tier: 'mandatory', treatment: 'collect' },
  { itemNumber: 7, label: 'Copy of KTP (valid)', tier: 'mandatory', treatment: 'collect' },
  { itemNumber: 8, label: 'Copy of BPJS Ketenagakerjaan card', tier: 'followUp', treatment: 'collect', note: 'Covers BPJS Pensiun — same program/number, not a separate card.' },
  { itemNumber: 10, label: 'Copy of BPJS Kesehatan card', tier: 'followUp', treatment: 'collect' },
  { itemNumber: 11, label: 'Copy of NPWP', tier: 'optional', treatment: 'collect' },
  { itemNumber: 12, label: 'Copy of Kartu Keluarga (Family Card)', tier: 'mandatory', treatment: 'collect' },
  { itemNumber: 13, label: 'Copy of SIM A/B/C (driving license)', tier: 'followUp', treatment: 'collect' },
  { itemNumber: 14, label: 'Copy of BCA bank account book', tier: 'followUp', treatment: 'collect' },
  { itemNumber: 15, label: 'Original — Medical check-up report', tier: 'optional', treatment: 'collect' },
  { itemNumber: 17, label: 'Psychological Test Result', tier: 'mandatory', treatment: 'verify', linkedRecordType: 'candidate' },
  { itemNumber: 18, label: 'Personnel Requisition Form', tier: 'mandatory', treatment: 'verify', linkedRecordType: 'requisition' },
  { itemNumber: 19, label: 'Application Form', tier: 'mandatory', treatment: 'verify', linkedRecordType: 'candidate' },
  { itemNumber: 20, label: 'Interview Assessment Form', tier: 'mandatory', treatment: 'verify', linkedRecordType: 'candidate' },
  { itemNumber: 21, label: 'Approval to Hire', tier: 'mandatory', treatment: 'verify', linkedRecordType: 'requisition' },
  { itemNumber: 22, label: 'Employment Agreement / Kontrak Kerja', tier: 'mandatory', treatment: 'collect', linkedRecordType: 'contract', note: 'Employment Contracts feature not built yet — flagged dependency.' },
  { itemNumber: 23, label: 'Employee Data Form', tier: 'mandatory', treatment: 'verify', linkedRecordType: 'employee' },
  { itemNumber: 24, label: 'Staff Inventory Movement Form', tier: 'mandatory', treatment: 'verify', note: 'Covered by the onboarding Asset Assignment task.' },
  { itemNumber: 25, label: 'Employee Photo Taking', tier: 'process', treatment: 'verify', note: 'Same photo as item 6.' },
  { itemNumber: 26, label: 'New Hire Announcement (Notice Board, WhatsApp, Email)', tier: 'process', treatment: 'notDigitized', note: 'WA/Email via Notification Engine; Notice Board stays physical.' },
  { itemNumber: 27, label: 'Formulir Penilaian Kerja (Performance appraisal form)', tier: 'process', treatment: 'notDigitized', note: 'Not onboarding-gating — filed whenever the first review happens.' },
  { itemNumber: 28, label: 'Surat Peringatan (if any)', tier: 'process', treatment: 'notDigitized', note: 'Not onboarding-gating — Disciplinary Actions output, filed as it occurs.' },
  { itemNumber: 29, label: 'SK Mutasi (if any)', tier: 'process', treatment: 'notDigitized', note: 'Not onboarding-gating — no Transfer module built yet.' },
]

export interface MockChecklistItem extends DocumentChecklistItemTemplate {
  status: ChecklistItemStatus
  receivedDate?: string
}

// employment-application-form.md §2 — canonical superset owned by the recruitment demo module.
export type { RecruitmentSource } from '../recruitment/candidatePipelineDemoData'
import type { RecruitmentSource } from '../recruitment/candidatePipelineDemoData'

export interface MockOnboardingChecklist {
  id: string
  employeeId: string
  startDate: string
  employeeStatusField: 'ft' | 'dw'
  recruitmentSource: RecruitmentSource
  status: 'inProgress' | 'completed'
  items: MockChecklistItem[]
}

function buildItems(receivedNumbers: number[], notApplicableNumbers: number[] = []): MockChecklistItem[] {
  return DOCUMENT_CHECKLIST_TEMPLATE.map((template) => {
    if (notApplicableNumbers.includes(template.itemNumber)) {
      return { ...template, status: 'notApplicable' }
    }
    if (receivedNumbers.includes(template.itemNumber)) {
      return { ...template, status: 'received', receivedDate: '2026-07-10' }
    }
    return { ...template, status: 'pending' }
  })
}

/** One checklist per active new hire in employeeDemoData.ts (demo-1..demo-4) — demo-5 is a separation, not a hire. */
export const MOCK_ONBOARDING_CHECKLISTS: MockOnboardingChecklist[] = [
  {
    id: 'onb-demo-1',
    employeeId: 'demo-1',
    startDate: '2023-01-01',
    employeeStatusField: 'ft',
    recruitmentSource: 'jobPortal',
    status: 'inProgress',
    // Missing mandatory items 12 (Kartu Keluarga) and 22 (Employment Agreement) — still blocked.
    items: buildItems([1, 2, 3, 4, 6, 7, 17, 18, 19, 20, 21, 23, 24, 25]),
  },
  {
    id: 'onb-demo-2',
    employeeId: 'demo-2',
    startDate: '2026-06-15',
    employeeStatusField: 'ft',
    recruitmentSource: 'referral',
    status: 'completed',
    // Every mandatory item received; a couple of follow-up items are still pending, which doesn't block completion.
    items: buildItems([1, 2, 3, 4, 5, 6, 7, 11, 12, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]),
  },
  {
    id: 'onb-demo-3',
    employeeId: 'demo-3',
    startDate: '2026-07-13',
    employeeStatusField: 'ft',
    recruitmentSource: 'appliedDirectly',
    status: 'inProgress',
    // Just started — only the candidate-verify items are in, everything collect-tier is still pending.
    items: buildItems([1, 2, 17, 18, 19, 20, 21]),
  },
  {
    id: 'onb-demo-4',
    employeeId: 'demo-4',
    startDate: '2026-07-01',
    employeeStatusField: 'dw',
    recruitmentSource: 'employmentAgency',
    status: 'inProgress',
    // Daily worker — most process/candidate-artifact items marked not applicable per the form's DW scope.
    items: buildItems([1, 2, 6, 7, 17, 18, 19, 20, 21, 23, 24], [5, 11, 15, 22]),
  },
]

export function findEmployee(employeeId: string) {
  return MOCK_EMPLOYEES.find((e) => e.id === employeeId)
}
