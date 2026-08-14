/**
 * The F01 "Employee In/Out Data Check List" IN sheet, as a data table —
 * employee-onboarding-exit-checklist.md §4. 30 printed rows, 28 active: item 9
 * (BPJS Pensiun) is merged into item 8 because it is the same program, and item
 * 16 (SKCK) was removed. Items 5, 11 and 15 are `optional` per §2 — a
 * deliberate downgrade from the paper form's markers, not an oversight.
 *
 * `verify` rows are artifacts another module already produced (the candidate
 * record, the requisition, its approval); onboarding links them rather than
 * asking for a re-upload (§8 criterion 2). `linkedRecordType` says where the
 * link points; the id is filled in when the checklist is generated or when HR
 * links it by hand.
 */
export interface OnboardingItemTemplate {
  itemNumber: number
  label: string
  tier: 'mandatory' | 'followUp' | 'optional' | 'process'
  treatment: 'collect' | 'verify' | 'generate' | 'notDigitized'
  linkedRecordType?: 'candidate' | 'requisition' | 'contract' | 'employee'
}

export const ONBOARDING_DOCUMENT_ITEMS: readonly OnboardingItemTemplate[] = [
  { itemNumber: 1, label: 'Application Letter / Surat Lamaran Kerja', tier: 'process', treatment: 'verify', linkedRecordType: 'candidate' },
  { itemNumber: 2, label: 'Curriculum Vitae / Daftar Riwayat Hidup', tier: 'process', treatment: 'verify', linkedRecordType: 'candidate' },
  { itemNumber: 3, label: 'Copy of Ijazah & transcript', tier: 'mandatory', treatment: 'collect' },
  { itemNumber: 4, label: 'Copy of Working Reference (if previously employed)', tier: 'mandatory', treatment: 'collect' },
  { itemNumber: 5, label: 'Copy of Professional Certification', tier: 'optional', treatment: 'collect' },
  { itemNumber: 6, label: 'Photo 4×6, red background', tier: 'mandatory', treatment: 'collect' },
  { itemNumber: 7, label: 'Copy of KTP (valid)', tier: 'mandatory', treatment: 'collect' },
  { itemNumber: 8, label: 'Copy of BPJS Ketenagakerjaan card (covers BPJS Pensiun)', tier: 'followUp', treatment: 'collect' },
  { itemNumber: 10, label: 'Copy of BPJS Kesehatan card', tier: 'followUp', treatment: 'collect' },
  { itemNumber: 11, label: 'Copy of NPWP', tier: 'optional', treatment: 'collect' },
  { itemNumber: 12, label: 'Copy of Kartu Keluarga (Family Card)', tier: 'mandatory', treatment: 'collect' },
  { itemNumber: 13, label: 'Copy of SIM A/B/C (driving license)', tier: 'followUp', treatment: 'collect' },
  { itemNumber: 14, label: 'Copy of BCA bank account book', tier: 'followUp', treatment: 'collect' },
  { itemNumber: 15, label: 'Original — Medical check-up report', tier: 'optional', treatment: 'collect' },
  { itemNumber: 17, label: 'Psychological Test Result', tier: 'mandatory', treatment: 'collect' },
  { itemNumber: 18, label: 'Personnel Requisition Form', tier: 'mandatory', treatment: 'verify', linkedRecordType: 'requisition' },
  { itemNumber: 19, label: 'Application Form', tier: 'mandatory', treatment: 'verify', linkedRecordType: 'candidate' },
  { itemNumber: 20, label: 'Interview Assessment Form', tier: 'mandatory', treatment: 'verify', linkedRecordType: 'candidate' },
  { itemNumber: 21, label: 'Approval to Hire', tier: 'mandatory', treatment: 'verify', linkedRecordType: 'requisition' },
  { itemNumber: 22, label: 'Employment Agreement / Kontrak Kerja', tier: 'mandatory', treatment: 'collect' },
  { itemNumber: 23, label: 'Employee Data Form', tier: 'mandatory', treatment: 'verify', linkedRecordType: 'employee' },
  { itemNumber: 24, label: 'Staff Inventory Movement Form', tier: 'mandatory', treatment: 'verify' },
  { itemNumber: 25, label: 'Employee Photo Taking', tier: 'process', treatment: 'verify' },
  { itemNumber: 26, label: 'New Hire Announcement (WhatsApp / Email; notice board stays physical)', tier: 'process', treatment: 'notDigitized' },
  { itemNumber: 27, label: 'Formulir Penilaian Kerja (performance appraisal form)', tier: 'process', treatment: 'notDigitized' },
  { itemNumber: 28, label: 'Surat Peringatan (if any)', tier: 'process', treatment: 'notDigitized' },
  { itemNumber: 29, label: 'SK Mutasi (if any)', tier: 'process', treatment: 'notDigitized' },
  { itemNumber: 30, label: 'Source of Recruitment', tier: 'process', treatment: 'verify', linkedRecordType: 'candidate' },
]
