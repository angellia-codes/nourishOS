/**
 * Payroll component registry — payroll-components-payslip-design.md §4.1/§4.3/§5.
 *
 * Decision 2 (§2) splits ownership: statutory components live in code because
 * their identity, rate keys and bases are law, not configuration; the
 * discretionary catalogue lives in Firestore (`payrollComponents`) and is
 * seeded from PAYROLL_COMPONENT_SEEDS below.
 *
 * Mirrored server-side in functions/src/lib/payroll.ts — same intentional
 * duplication as collections.ts / permissions.ts / positions.ts, since
 * functions/ is a separate tsconfig project and cannot import from src/.
 * Change one, change both.
 */

/** Which column(s) a component prints in. 'both' generates §3's mirror pair. */
export type ComponentSide = 'income' | 'deduction' | 'both'

export interface StatutoryComponent {
  /** Key into PayrollParameters. Null for PPh 21 — CSV-supplied, not recomputable (§4.1). */
  rateKey: string | null
  /** 'basicSalary' | 'jpCappedBase' | 'bpjsKesBase'. Null for PPh 21. */
  baseKey: string | null
  side: ComponentSide
  /** Present only when side === 'both' — links the income row to its deduction twin. */
  pairId?: string
  sortOrder: number
  csvColumn: string
  /**
   * §10: statutory programs keep their legal Indonesian name in BOTH label
   * fields. Do not "fix" this — translating `Jaminan Hari Tua` breaks
   * reconciliation against BPJS statements.
   *
   * The payer suffix (Perusahaan/Karyawan) is an as-built addition: five
   * programs appear on both sides of the slip, and the legal name alone
   * cannot tell the employer's mirror row apart from the employee's own
   * deduction. The program name itself is untouched.
   */
  label: string
}

/** §4.1 — ten entries, not editable at runtime. */
export const STATUTORY_COMPONENTS: Record<string, StatutoryComponent> = {
  JKK_COMPANY: {
    rateKey: 'jkk', baseKey: 'basicSalary', side: 'both', pairId: 'jkk',
    sortOrder: 13, csvColumn: 'JKK', label: 'Jaminan Kecelakaan Kerja',
  },
  JKM_COMPANY: {
    rateKey: 'jkm', baseKey: 'basicSalary', side: 'both', pairId: 'jkm',
    sortOrder: 14, csvColumn: 'JKM', label: 'Jaminan Kematian',
  },
  BPJS_KES_COMPANY: {
    rateKey: 'bpjsKesCo', baseKey: 'bpjsKesBase', side: 'both', pairId: 'bpjsKes',
    sortOrder: 15, csvColumn: 'BPJS_KES_COMPANY', label: 'BPJS Kesehatan (Perusahaan)',
  },
  JHT_COMPANY: {
    rateKey: 'jhtCompany', baseKey: 'basicSalary', side: 'both', pairId: 'jht',
    sortOrder: 16, csvColumn: 'JHT_COMPANY', label: 'Jaminan Hari Tua (Perusahaan)',
  },
  JP_COMPANY: {
    rateKey: 'jpCompany', baseKey: 'jpCappedBase', side: 'both', pairId: 'jp',
    sortOrder: 17, csvColumn: 'JP_COMPANY', label: 'Jaminan Pensiun (Perusahaan)',
  },
  BPJS_KES_EMPLOYEE: {
    rateKey: 'bpjsKesEmp', baseKey: 'bpjsKesBase', side: 'deduction',
    sortOrder: 2, csvColumn: 'BPJS_KES_EMPLOYEE', label: 'BPJS Kesehatan',
  },
  BPJS_KES_FAMILY: {
    rateKey: 'bpjsKesFam', baseKey: 'bpjsKesBase', side: 'deduction',
    sortOrder: 3, csvColumn: 'BPJS_KES_FAMILY', label: 'BPJS Kesehatan Keluarga',
  },
  JHT_EMPLOYEE: {
    rateKey: 'jhtEmployee', baseKey: 'basicSalary', side: 'deduction',
    sortOrder: 4, csvColumn: 'JHT_EMPLOYEE', label: 'Jaminan Hari Tua (Karyawan)',
  },
  JP_EMPLOYEE: {
    rateKey: 'jpEmployee', baseKey: 'jpCappedBase', side: 'deduction',
    sortOrder: 5, csvColumn: 'JP_EMPLOYEE', label: 'Jaminan Pensiun (Karyawan)',
  },
  PPH21: {
    rateKey: null, baseKey: null, side: 'deduction',
    sortOrder: 7, csvColumn: 'PPH21', label: 'Tax PPh 21 from Salary',
  },
}

/** The nine the validator independently recomputes (§6.4) — everything except PPh 21. */
export const RECOMPUTABLE_COMPONENT_IDS: readonly string[] = Object.entries(STATUTORY_COMPONENTS)
  .filter(([, component]) => component.rateKey !== null)
  .map(([id]) => id)

export interface PayrollComponentSeed {
  code: string
  labelId: string
  labelEn: string
  type: 'earning' | 'deduction'
  sortOrder: number
  csvColumn: string
  isTaxable: boolean
}

/** §4.3 — fourteen seeded discretionary entries, twelve earnings and two deductions. */
export const PAYROLL_COMPONENT_SEEDS: readonly PayrollComponentSeed[] = [
  { code: 'BASIC_SALARY', labelId: 'Gaji Pokok', labelEn: 'Basic Salary', type: 'earning', sortOrder: 1, csvColumn: 'BASIC_SALARY', isTaxable: true },
  { code: 'OUTSTANDING_LEAVE', labelId: 'Sisa Cuti', labelEn: 'Outstanding Leave', type: 'earning', sortOrder: 2, csvColumn: 'OUTSTANDING_LEAVE', isTaxable: true },
  { code: 'TRANSPORT_ALLOWANCE', labelId: 'Tunjangan Transport', labelEn: 'Transport Allowance', type: 'earning', sortOrder: 3, csvColumn: 'TRANSPORT_ALLOWANCE', isTaxable: true },
  { code: 'PHONE_ALLOWANCE', labelId: 'Tunjangan Telepon', labelEn: 'Phone Allowance', type: 'earning', sortOrder: 4, csvColumn: 'PHONE_ALLOWANCE', isTaxable: true },
  { code: 'MEAL_ALLOWANCE', labelId: 'Tunjangan Makan', labelEn: 'Meal Allowance', type: 'earning', sortOrder: 5, csvColumn: 'MEAL_ALLOWANCE', isTaxable: true },
  { code: 'POSITION_ALLOWANCE', labelId: 'Tunjangan Jabatan', labelEn: 'Position Allowance', type: 'earning', sortOrder: 6, csvColumn: 'POSITION_ALLOWANCE', isTaxable: true },
  { code: 'BIRTHDAY_BONUS', labelId: 'Bonus Ulang Tahun', labelEn: 'Birthday Bonus', type: 'earning', sortOrder: 7, csvColumn: 'BIRTHDAY_BONUS', isTaxable: true },
  { code: 'COMPENSATION_BENEFIT', labelId: 'Kompensasi', labelEn: 'Compensation Benefit', type: 'earning', sortOrder: 8, csvColumn: 'COMPENSATION_BENEFIT', isTaxable: true },
  { code: 'TIPS', labelId: 'Tips', labelEn: 'Tips', type: 'earning', sortOrder: 9, csvColumn: 'TIPS', isTaxable: true },
  { code: 'SERVICE_CHARGE', labelId: 'Service Charge', labelEn: 'Service Charge', type: 'earning', sortOrder: 10, csvColumn: 'SERVICE_CHARGE', isTaxable: true },
  { code: 'THR_ANNUAL_BONUS', labelId: 'THR / Bonus Tahunan', labelEn: 'THR/Annual Bonus', type: 'earning', sortOrder: 11, csvColumn: 'THR_ANNUAL_BONUS', isTaxable: true },
  { code: 'INCOME_TAX_ALLOWANCE_21', labelId: 'Tunjangan PPh 21', labelEn: 'Income Tax Allowance 21', type: 'earning', sortOrder: 12, csvColumn: 'INCOME_TAX_ALLOWANCE_21', isTaxable: true },
  { code: 'UNPAID_BASIC', labelId: 'Potongan Gaji Pokok', labelEn: 'Unpaid Basic', type: 'deduction', sortOrder: 1, csvColumn: 'UNPAID_BASIC', isTaxable: false },
  { code: 'LOAN_DEDUCTION', labelId: 'Potongan Pinjaman', labelEn: 'Deduction (Loan)', type: 'deduction', sortOrder: 6, csvColumn: 'LOAN_DEDUCTION', isTaxable: false },
]

/** §5 — the identity block. */
export const PAYROLL_CSV_IDENTITY_COLUMNS = ['employeeNumber', 'legacyEmployeeId', 'fullName', 'period'] as const
/** §5 — source arithmetic, cross-checked against the expanded line items (§6.2). */
export const PAYROLL_CSV_TOTAL_COLUMNS = ['totalIncome', 'totalDeduction', 'takeHomePay'] as const
/** §6.4 — a non-empty value bypasses the statutory recompute for that row. */
export const PAYROLL_CSV_OVERRIDE_COLUMN = 'statutoryOverrideReason'

/**
 * §5 — the full 32-column contract, in order. Mirror components appear ONCE;
 * the importer expands each into two line items. Supplying them twice would
 * invite the two halves to diverge.
 */
export const PAYROLL_CSV_COLUMNS: readonly string[] = [
  ...PAYROLL_CSV_IDENTITY_COLUMNS,
  ...PAYROLL_COMPONENT_SEEDS.filter((c) => c.type === 'earning').map((c) => c.csvColumn),
  ...PAYROLL_COMPONENT_SEEDS.filter((c) => c.type === 'deduction').map((c) => c.csvColumn),
  ...Object.values(STATUTORY_COMPONENTS).filter((c) => c.side === 'deduction').map((c) => c.csvColumn),
  ...Object.values(STATUTORY_COMPONENTS).filter((c) => c.side === 'both').map((c) => c.csvColumn),
  ...PAYROLL_CSV_TOTAL_COLUMNS,
  PAYROLL_CSV_OVERRIDE_COLUMN,
]

/** §6.4 — absolute rupiah tolerance absorbing rounding differences. */
export const STATUTORY_TOLERANCE_IDR = 100

/** §6.5 — Firestore's limit is 500; 400 leaves headroom for the batch document itself. */
export const PAYROLL_WRITE_CHUNK_SIZE = 400

/** §4.2 defaults, offered as form values on the Parameters page — never written automatically. */
export const PAYROLL_PARAMETER_DEFAULTS = {
  jkk: 0.0054,
  jkm: 0.003,
  jhtCompany: 0.037,
  jhtEmployee: 0.02,
  jpCompany: 0.02,
  jpEmployee: 0.01,
  bpjsKesCo: 0.04,
  bpjsKesEmp: 0.01,
  bpjsKesFam: 0.01,
  jpWageCeiling: 11086300,
  bpjsKesCeiling: 12000000,
} as const
