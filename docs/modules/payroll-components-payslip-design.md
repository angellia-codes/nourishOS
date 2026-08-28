# Payroll Components & Payslip — Design Spec

**Version:** 1.0
**Date:** 2026-08-26
**Status:** Approved — ready for implementation planning
**Module:** HR / Finance (shared)
**Author:** Design session, Angel + Claude

---

## 1. Scope

### In scope

- **Payroll component registry** — the catalogue of salary line items (earnings and deductions), their identity, calculation rules, bases, caps, and ordering.
- **Annual statutory parameters** — BPJS rates and wage ceilings, versioned by year.
- **Payslip document** — an immutable per-employee, per-period snapshot.
- **CSV batch import** — bulk ingestion of externally-computed payslips, with validation and reconciliation.
- **Approval flow** — payroll batches move through the standard workflow before payslips become readable.
- **React payslip renderer** — screen view and print/PDF output, replicating the existing Excel artifact.

### Out of scope

| Excluded | Rationale | Where it belongs |
|---|---|---|
| Payroll calculation engine | Excel remains the calculator (§2, decision 5) | Future spec, once attendance exists |
| PPh 21 tax engine | Requires PTKP tables, annualisation, gross-up logic | Future spec |
| Attendance / proration | No attendance module exists in NourishOS | Prerequisite for the calculation engine |
| Employee self-service | No ESS pattern exists; floor staff account status unresolved | Future spec (§14) |
| Disbursement / bank file export | Payment execution stays outside the system | Future spec |
| Payslip distribution (WhatsApp/email) | Notification Engine integration deferred | Future spec |

### Success criteria

1. A month's payroll can be imported from CSV, validated, approved, and archived without manual per-employee data entry.
2. Every archived payslip renders identically to the Excel slip it replaced.
3. Statutory contribution errors are caught before payment, or bypassed with an audited reason.
4. Salary data is readable only by HR Manager, Finance Manager, GM, Director, and Super Admin.

---

## 2. Decision log

| # | Decision | Chosen | Rejected alternatives |
|---|---|---|---|
| 1 | Session scope | Component master + payslip layout | Component master only; full payroll run |
| 2 | Component catalogue ownership | Hybrid — statutory in code, discretionary in Firestore | All-Firestore; all-code |
| 3 | Employer contribution representation | Mirrored line pairs, replicating the Excel | Separate third section; omit entirely |
| 4 | Payslip persistence | Immutable snapshot | Recompute on view; hybrid |
| 5 | CSV payload | Full computed slip; inputs-only deferred | Inputs-only |
| 6 | Payslip readership | HR / Finance only | Employee self-service |
| 7 | Payslip header source | Resolved from employee record | From CSV; CSV with mismatch warning |
| 8 | Import join key | `employeeNumber`, cross-checked against `legacyEmployeeId` | `employeeNumber` alone; legacy ID alone |
| 9 | Statutory recompute mismatch | Hard fail with audited `statutoryOverride` bypass | Warning only; hard fail with no bypass |
| 10 | Payslip language | English, statutory programs keep legal Indonesian names | Bilingual inline; Indonesian only |
| 11 | Column balance | Pad the shorter column so mirror blocks align | Let it end short; extract mirrors to a strip |
| 12 | Mirror row visual marking | None — plain, matching the original artifact | Tinted rows with explanatory footnote |

---

## 3. Slip anatomy (source of truth)

Derived from the July 2026 slip for employee 273.

- **29 line items total** — 17 income, 12 deduction.
- **5 mirror pairs** — employer BPJS contributions appearing identically on both sides, netting to zero.
- **Mirror total:** Rp 1,061,626. Both column totals are inflated by this amount.
- **True gross:** 19,072,107. **True deductions:** 11,861,233. **Take home pay:** 7,210,874.
- **14 of 29 lines are nil** for this employee (10 income, 4 deduction) — components are per-employee applicable, not universal.

### Verified calculation bases

| Component | Rate | Base | Evidence |
|---|---|---|---|
| Jaminan Kecelakaan Kerja (company) | 0.54% | Basic salary | 0.0054 × 18,500,000 = 99,900 ✓ |
| Jaminan Kematian (company) | 0.3% | Basic salary | 0.003 × 18,500,000 = 55,500 ✓ |
| Jaminan Hari Tua (company) | 3.7% | Basic salary | 0.037 × 18,500,000 = 684,500 ✓ |
| Jaminan Hari Tua (employee) | 2% | Basic salary | 0.02 × 18,500,000 = 370,000 ✓ |
| Jaminan Pensiun (company) | 2% | **Capped base** | 221,726 ÷ 0.02 = 11,086,300 ≠ basic salary |
| Jaminan Pensiun (employee) | 1% | **Capped base** | 110,863 ÷ 0.01 = 11,086,300 ✓ |
| BPJS Kesehatan | 4% / 1% | Capped base | Nil on this slip; ceiling applies |

**Critical:** Jaminan Pensiun uses a statutory wage ceiling (Rp 11,086,300 for 2026), not basic salary. This ceiling changes annually and must be a versioned parameter, never a constant.

---

## 4. Data model

### 4.1 `src/constants/payroll.ts` — statutory registry (code-owned)

Ten entries. Not editable at runtime.

```ts
export const STATUTORY_COMPONENTS = {
  JKK_COMPANY:       { rateKey: 'jkk',         baseKey: 'basicSalary',  side: 'both',      pairId: 'jkk',     sortOrder: 13 },
  JKM_COMPANY:       { rateKey: 'jkm',         baseKey: 'basicSalary',  side: 'both',      pairId: 'jkm',     sortOrder: 14 },
  BPJS_KES_COMPANY:  { rateKey: 'bpjsKesCo',   baseKey: 'bpjsKesBase',  side: 'both',      pairId: 'bpjsKes', sortOrder: 15 },
  JHT_COMPANY:       { rateKey: 'jhtCompany',  baseKey: 'basicSalary',  side: 'both',      pairId: 'jht',     sortOrder: 16 },
  JP_COMPANY:        { rateKey: 'jpCompany',   baseKey: 'jpCappedBase', side: 'both',      pairId: 'jp',      sortOrder: 17 },
  BPJS_KES_EMPLOYEE: { rateKey: 'bpjsKesEmp',  baseKey: 'bpjsKesBase',  side: 'deduction', sortOrder: 2 },
  BPJS_KES_FAMILY:   { rateKey: 'bpjsKesFam',  baseKey: 'bpjsKesBase',  side: 'deduction', sortOrder: 3 },
  JHT_EMPLOYEE:      { rateKey: 'jhtEmployee', baseKey: 'basicSalary',  side: 'deduction', sortOrder: 4 },
  JP_EMPLOYEE:       { rateKey: 'jpEmployee',  baseKey: 'jpCappedBase', side: 'deduction', sortOrder: 5 },
  PPH21:             { rateKey: null,          baseKey: null,           side: 'deduction', sortOrder: 7 },
} as const
```

- `side: 'both'` generates the mirror pair — one income line and one deduction line, same amount, same `pairId`.
- `PPH21` has no rate or base: it is CSV-supplied and not recomputable until a tax engine exists.
- Labels for statutory components are identical in `labelId` and `labelEn` — the legal Indonesian name is canonical in both.

### 4.2 `payrollParameters/{year}` — annual statutory values

One document per calendar year. Written by Super Admin only.

```ts
interface PayrollParameters extends BaseDocument {
  year: number                 // 2026
  jkk: number                  // 0.0054
  jkm: number                  // 0.003
  jhtCompany: number           // 0.037
  jhtEmployee: number          // 0.02
  jpCompany: number            // 0.02
  jpEmployee: number           // 0.01
  bpjsKesCo: number            // 0.04
  bpjsKesEmp: number           // 0.01
  bpjsKesFam: number           // 0.01
  jpWageCeiling: number        // 11086300
  bpjsKesCeiling: number
  effectiveFrom: string        // 'YYYY-MM-DD'
}
```

The JKK rate varies by industry risk class. If Nourish Group's classification differs across entities, this becomes a per-entity parameter — flagged, not assumed.

### 4.3 `payrollComponents/{componentId}` — discretionary registry (HR-configurable)

Fourteen seeded entries, twelve earnings and two deductions.

```ts
interface PayrollComponent extends BaseDocument {
  code: string          // 'BASIC_SALARY' — stable, used as CSV column key
  labelId: string       // 'Gaji Pokok'
  labelEn: string       // 'Basic Salary'
  type: 'earning' | 'deduction'
  sortOrder: number
  csvColumn: string
  isActive: boolean
  isTaxable: boolean    // reserved for the future tax engine; not read in v1
}
```

**Seed set:**

| Code | Label (EN) | Type | Order |
|---|---|---|---|
| `BASIC_SALARY` | Basic Salary | earning | 1 |
| `OUTSTANDING_LEAVE` | Outstanding Leave | earning | 2 |
| `TRANSPORT_ALLOWANCE` | Transport Allowance | earning | 3 |
| `PHONE_ALLOWANCE` | Phone Allowance | earning | 4 |
| `MEAL_ALLOWANCE` | Meal Allowance | earning | 5 |
| `POSITION_ALLOWANCE` | Position Allowance | earning | 6 |
| `BIRTHDAY_BONUS` | Birthday Bonus | earning | 7 |
| `COMPENSATION_BENEFIT` | Compensation Benefit | earning | 8 |
| `TIPS` | Tips | earning | 9 |
| `SERVICE_CHARGE` | Service Charge | earning | 10 |
| `THR_ANNUAL_BONUS` | THR/Annual Bonus | earning | 11 |
| `INCOME_TAX_ALLOWANCE_21` | Income Tax Allowance 21 | earning | 12 |
| `UNPAID_BASIC` | Unpaid Basic | deduction | 1 |
| `LOAN_DEDUCTION` | Deduction (Loan) | deduction | 6 |

**Deletion is soft only** (`isActive: false`). Historical payslips hold `componentId` references; hard deletion would orphan them.

### 4.4 `payrollBatches/{batchId}`

```ts
interface PayrollBatch extends BaseDocument {
  period: string                  // '2026-07'
  outletId?: string               // optional scoping; omit for all-outlet batch
  parametersYear: number
  rowCount: number
  sourceFileName: string
  sourceFileHash: string          // rejects duplicate re-upload
  totals: {
    totalIncome: number
    totalDeduction: number
    totalTakeHomePay: number
    totalEmployerCost: number     // sum of mirror income lines
  }
  reconciliation: {
    hardFailures: ValidationIssue[]
    warnings: ValidationIssue[]
    overriddenRows: string[]      // employeeNumbers with statutoryOverride
  }
  status: 'draft' | 'submitted' | 'pendingApproval' | 'approved' | 'rejected' | 'completed'
  approvalRequestId?: string
}
```

### 4.5 `payslips/{payslipId}`

Immutable after the batch reaches `approved`.

```ts
interface Payslip extends BaseDocument {
  batchId: string
  period: string

  // Identity — resolved from the employee record at import, then frozen
  employeeId: string
  employeeUid: string | null      // denormalized for future ESS rule-scoping
  employeeNumber: string          // 'N-0273'
  legacyEmployeeId: string | null // '273'
  fullName: string
  outletId: string
  outletName: string
  position: string
  taxStatus: TaxStatus            // 'K0'

  lineItems: PayslipLineItem[]

  totalIncome: number
  totalDeduction: number
  takeHomePay: number
  totalEmployerCost: number

  parametersYear: number
  statutoryOverrideReason: string | null
  issuedAt: Timestamp
  supersedesPayslipId: string | null
  supersededByPayslipId: string | null
}

interface PayslipLineItem {
  componentId: string             // 'BASIC_SALARY' | 'JHT_COMPANY'
  labelId: string
  labelEn: string
  side: 'income' | 'deduction'
  amount: number                  // 0 renders as '-' or blank
  rate: number | null             // 0.037
  base: number | null             // 18500000
  isEmployerMirror: boolean
  pairId: string | null
  sortOrder: number
}
```

**Labels are denormalized onto every line.** The renderer performs no lookups, and relabelling a component in 2027 cannot rewrite a 2026 slip.

**`isEmployerMirror` is the integrity guardrail for decision 3.** The mirror inflates both column totals by design. Any consumer needing honest figures filters `isEmployerMirror === false`. Without this flag the mirror would be unrecoverable from stored data.

### 4.6 `employees/{employeeId}` — field addition

```ts
legacyEmployeeId: string | null   // '273' — populated once at migration
```

Single field. Bridges the pre-NourishOS numbering to `employeeNumber` and serves as the import cross-check.

### 4.7 `src/constants/outlets.ts` — enum

```ts
export const OUTLETS = {
  NOURISH_UNGASAN:    'Nourish Ungasan',
  NOURISH_ULUWATU:    'Nourish Uluwatu',
  NOURISH_BERAWA:     'Nourish Berawa',
  THE_BAKERY_ULUWATU: 'The Bakery Uluwatu',
  THE_BAKERY_KITCHEN: 'The Bakery Kitchen',
  WHOLEFOOD:          'Wholefood',
  NOURISH_GROUP:      'Nourish Group',
} as const
```

`Nourish Group` is the payroll home for HQ and non-outlet staff — it replaces the Excel's `BOH NOURISH GROUP`. **See §14, open item 1** — this list diverges from the project docs and must not be settled inside a payroll spec by default.

---

## 5. CSV contract

Thirty-two columns. One row per employee.

| Group | Columns | Count |
|---|---|---|
| Identity | `employeeNumber`, `legacyEmployeeId`, `fullName`, `period` | 4 |
| Discretionary earnings | one per earning component code | 12 |
| Discretionary deductions | `UNPAID_BASIC`, `LOAN_DEDUCTION` | 2 |
| Employee statutory | `BPJS_KES_EMPLOYEE`, `BPJS_KES_FAMILY`, `JHT_EMPLOYEE`, `JP_EMPLOYEE`, `PPH21` | 5 |
| Employer statutory | `JKK`, `JKM`, `BPJS_KES_COMPANY`, `JHT_COMPANY`, `JP_COMPANY` | 5 |
| Totals | `totalIncome`, `totalDeduction`, `takeHomePay` | 3 |
| Override | `statutoryOverrideReason` | 1 |

**Mirror components appear once in the CSV.** The importer expands each into two line items. Supplying them twice would invite the two halves to diverge.

**Empty cells are zero.** The distinction between "nil" and "not applicable" is a render concern, not a data one.

---

## 6. Import and validation

### 6.1 Flow

```
upload → parse → resolve → validate → reconciliation preview
       → submit → Approval Engine → approved → payslips readable
```

Payslips are written at `createPayrollBatch` time but are **not readable** until the batch reaches `approved`. A partially-failed import must never leave a month half-published.

### 6.2 Hard failures — row rejected, batch cannot be submitted

| Check | Reason |
|---|---|
| `employeeNumber` not found | No join target |
| `legacyEmployeeId` mismatch | Decision 8 cross-check failed |
| `fullName` ≠ resolved record | Only human-readable proof the join landed correctly |
| Duplicate `employeeNumber` in file | Risk of double payment |
| Payslip already exists for employee + period | Unless `supersedesPayslipId` is set |
| `totalIncome` ≠ Σ income lines | Source arithmetic broken |
| `totalDeduction` ≠ Σ deduction lines | Source arithmetic broken |
| `takeHomePay` ≠ `totalIncome` − `totalDeduction` | Source arithmetic broken |
| Mirror pair amounts unequal | Breaks the gross-up invariant |
| `takeHomePay` < 0 | Always an error |
| Unknown or missing CSV column | Schema drift |
| Statutory recompute variance > Rp 100 | See §6.4 |
| `sourceFileHash` already imported | Duplicate month |

### 6.3 Warnings — surfaced in preview, non-blocking

| Check | Legitimate cause |
|---|---|
| CSV `BASIC_SALARY` ≠ compensation record | Mid-period raise |
| Employee `status: 'inactive'` but has pay | Final pay |
| Employee in compensation collection but absent from CSV | Possible omission — or a genuine unpaid month |
| Nil BPJS lines for an employee with BPJS numbers on file | Enrolment gap worth checking |

### 6.4 Statutory recompute

The validator independently recomputes nine of the ten statutory components — all except `PPH21` — from `payrollParameters/{year}` and the employee's basic salary, and compares against the CSV.

- Tolerance: **Rp 100** absolute, absorbing rounding differences.
- Variance beyond tolerance is a **hard failure**.
- A per-row `statutoryOverrideReason` (non-empty string) bypasses the check for that row. The reason is persisted on the payslip, surfaced in the reconciliation preview, listed in `batch.reconciliation.overriddenRows`, and written to the audit log.

**Rationale:** this is the highest-value check in the validator — statutory contributions are what a labour inspection examines. A hard fail with no escape hatch would be worked around by editing the CSV until it passes, which is strictly worse than a warning. The bypass exists so that legitimate exceptions leave a trace.

### 6.5 Batching

Writes are chunked at **400 documents per `writeBatch`**. Forty staff × 29 line items is comfortably within limits today, but the unbounded-batch pattern currently affecting `markAllNotificationsRead` must not be reproduced.

---

## 7. Cloud Functions

| Function | Purpose | Writes |
|---|---|---|
| `parsePayrollCsv` | Parse, resolve, validate, return reconciliation report | None |
| `createPayrollBatch` | Write batch + payslips as `draft` | Batch, payslips |
| `submitPayrollBatch` | Transition to `pendingApproval`, raise approval request | Batch, approval request |
| `getPayslip` | Read a single payslip with RBAC enforcement | None |
| `listPayslips` | Filtered list by period, outlet, employee | None |
| `supersedePayslip` | Issue a correction linked to the original | Payslip pair |
| `upsertPayrollComponent` | Discretionary component CRUD | Component |
| `upsertPayrollParameters` | Annual statutory parameters (Super Admin only) | Parameters |

All follow the established pattern: `onCall({ region: REGION })`, `requireActiveUser`, `requirePermission`, `AppError`, `successResponse`, `newDocumentBaseFields` / `updatedFields`, `recordAuditEvent`, wrapped in `try/catch` with `handleError`. All exported from `functions/src/index.ts`.

Batch approval resolution reuses the existing `registerApprovalResolvedHandler` pattern — no bespoke approval logic.

---

## 8. RBAC

New permissions in `src/constants/permissions.ts`:

| Permission | Grants | Roles |
|---|---|---|
| `payroll.read` | View payslips and batches | HR Manager, Finance Manager, GM, Director, Super Admin |
| `payroll.import` | Upload and create batches | HR Manager, Super Admin |
| `payroll.approve` | Approve a batch | Finance Manager, GM, Director, Super Admin |
| `payroll.manageComponents` | Discretionary component CRUD | HR Manager, Super Admin |
| `payroll.manageParameters` | Annual statutory parameters | Super Admin |
| `payroll.readOwn` | Reserved — not granted in v1 | — (future ESS) |

Outlet-scoping applies to `payroll.read` for Outlet Managers **only if** that role is later granted the permission. In v1 it is not: payroll visibility is HQ-only.

Firestore rules: `payslips` and `payrollBatches` are readable only with `payroll.read` **and** only when the parent batch status is `approved`. All writes are Cloud-Function-only.

---

## 9. React component architecture

```
src/features/payroll/
├── components/
│   ├── payslip/
│   │   ├── PayslipDocument.tsx      # pure renderer, takes one Payslip
│   │   ├── PayslipHeader.tsx
│   │   ├── PayslipColumn.tsx        # income or deduction
│   │   ├── PayslipLineRow.tsx
│   │   ├── PayslipTotals.tsx
│   │   ├── PayslipSignatureBlock.tsx
│   │   └── index.ts
│   ├── import/
│   │   ├── PayrollCsvUpload.tsx
│   │   ├── ReconciliationPreview.tsx
│   │   ├── ValidationIssueList.tsx
│   │   └── index.ts
│   └── components/
│       ├── PayrollComponentTable.tsx
│       ├── PayrollComponentForm.tsx
│       └── index.ts
├── hooks/
│   ├── usePayslip.ts
│   ├── usePayslips.ts
│   ├── usePayrollBatch.ts
│   └── usePayrollComponents.ts
├── pages/
│   ├── PayrollBatchListPage.tsx
│   ├── PayrollImportPage.tsx
│   ├── PayslipViewPage.tsx
│   └── PayrollComponentsPage.tsx
└── types/payroll.types.ts
```

**`PayslipDocument` is a pure function of one `Payslip` document.** No async config fetch, no component registry lookup, no year resolution. This makes it snapshot-testable and print-safe — and is the direct payoff of decision 4.

---

## 10. Payslip render rules

Replicates the source Excel artifact exactly.

| Aspect | Rule |
|---|---|
| Language | English. Statutory programs keep their legal Indonesian names (`Jaminan Hari Tua`, `BPJS Kesehatan`, `Tax PPh 21 from Salary`) |
| Case | Title Case for labels, matching the source document — a deliberate exception to the design system's sentence-case rule |
| Amounts | `IBM Plex Mono`, right-aligned, comma thousand separators (`18,500,000`) |
| Nil values | `-` for statutory lines, blank for discretionary lines, matching the source |
| Nil rows | Always printed, never suppressed — enables month-to-month comparison |
| Column balance | Shorter column padded so mirror blocks align horizontally (decision 11) |
| Mirror rows | No visual marking (decision 12) — the flag exists in data only |
| Header | `Employee ID`, `Name`, `Outlet`, `Status`, `Position`, `Salary Month` |
| Take Home Pay | Filled highlight row, bottom-left |
| Signature block | `Received by,` with employee and company signatory lines |

**Language is a render flag, not a data constraint.** Both `labelId` and `labelEn` are stored on every line. If ESS ships and floor staff become readers, Indonesian is a rendering change with no migration.

**Do not "fix" the statutory naming inconsistency.** Statutory components deliberately carry the same Indonesian name in both label fields. Translating `Jaminan Hari Tua` to `Old Age Security` would break reconciliation against BPJS statements.

---

## 11. Corrections

Payslips are immutable. A correction issues a **new** payslip with `supersedesPayslipId` set; the original gains `supersededByPayslipId` and renders with a superseded marker.

Recomputing a payslip in place is explicitly forbidden — it would destroy the record that an error occurred, which is precisely what an audit needs to see.

---

## 12. Audit

Per §14 of the architecture rules, every mutation writes to the Audit Log Service:

- Batch created, submitted, approved, rejected
- Payslip issued, superseded
- Statutory override applied — with the reason string and the variance amount
- Component created, updated, deactivated
- Annual parameters created or updated

---

## 13. Acceptance criteria

The module is complete when:

1. A CSV of 40+ rows imports, validates, and produces a reconciliation preview in under 10 seconds.
2. Every hard-failure condition in §6.2 is covered by a test that supplies a violating row and asserts rejection.
3. A statutory variance beyond Rp 100 blocks submission; the same row with a non-empty `statutoryOverrideReason` passes and appears in `overriddenRows` and the audit log.
4. `PayslipDocument` renders the July 2026 reference slip identically to the source Excel, verified by snapshot test.
5. A user without `payroll.read` receives `permission-denied` from both the Cloud Function and Firestore rules.
6. Payslips in a `draft` or `pendingApproval` batch are unreadable by every role.
7. Re-uploading an identical CSV is rejected on `sourceFileHash`.
8. A superseded payslip renders with its marker and links to its replacement.

---

## 14. Open items

These are **unresolved** and must be closed before or during implementation. None is silently assumed.

### 1. Outlet enum conflict — blocking

The seven-outlet list in §4.7 diverges from the project documentation, which carries `Central Kitchen` and `Head Office` and names the retail arm `Wholefood/Retail`. This spec's list drops the first two, adds `Nourish Group`, and renames the third.

`src/constants/outlets.ts` is read by every module. This enum must not be settled inside a payroll spec by default. **Requires explicit sign-off, and likely a migration of existing `outletId` values.**

### 2. `firestore.rules` conflict — hard prerequisite

Two conflicting rules files exist in different locations; `firebase.json` in `src/` points at `src/firestore.rules`. This is the prime suspect for the `/unauthorized` redirect bug.

Payroll introduces the most sensitive rules in the system. **It cannot ship over an unresolved rules ambiguity.** Phase 0 remediation is a gate on this module, not a parallel workstream.

### 3. `position` holds department strings

`employee.position` currently stores department names — the reference slip shows `SALES & MARKETING`, which is a department, not a position. Because payslips are immutable snapshots, every slip issued before Module A (Positions Master) lands will freeze a department string in its `position` field.

Cosmetic, but permanent. Options: accept it; block payroll on Module A; or backfill `position` for payroll-eligible staff first. **Decision needed.**

### 4. JKK risk classification

The 0.54% JKK rate corresponds to a specific industry risk class. If Nourish Group's entities carry different classifications, `jkk` becomes a per-entity rather than per-year parameter. **Confirm with the BPJS registration before seeding `payrollParameters/2026`.**

### 5. `Unpaid Basic` semantics

The reference slip deducts Rp 11,260,870 of an 18,500,000 basic — roughly 61%. The mechanism (unpaid leave, absence, mid-month join, or proration) is not documented. It does not block v1, since the amount is CSV-supplied, but the calculation engine cannot be specified without it.

### 6. Legacy ID backfill

`legacyEmployeeId` must be populated for every payroll-eligible employee before the first import, or every row hard-fails on the §6.2 cross-check. This is a data task, not an engineering one, and it is on the critical path.

---

## 15. Deferred — future specs

| Item | Trigger |
|---|---|
| Inputs-only CSV import | Once the calculation engine exists |
| Payroll calculation engine | Once attendance and PPh 21 engines exist |
| PPh 21 tax engine | Independent; needs PTKP tables and annualisation rules |
| Attendance integration | Prerequisite for proration |
| Employee self-service payslips | Once floor staff account provisioning is resolved |
| Payslip distribution via WhatsApp/email | Notification Engine integration |
| Bank disbursement file export | Finance module maturity |
| Payroll cost reporting and BI | Reads `isEmployerMirror === false` for honest figures |
